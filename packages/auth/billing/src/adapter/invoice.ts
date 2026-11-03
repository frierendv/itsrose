import type { MidtransClient } from "@itsrose/midtrans";
import type { GenericEndpointContext } from "better-auth";
import { INVOICE_TYPE } from "../domain/constants";
import {
	buildInvoiceRecord,
	isVoidableStatus,
	planInvoiceChange,
	planUpgradeInvoice,
	resolveInvoiceSyncUpdate,
	type InvoiceCreationPlan,
	type MidtransInvoiceResult,
} from "../domain/invoice.service";
import type {
	ApiPlan,
	BillingPluginOptions,
	TransactionInvoice,
	TransactionInvoiceEvent,
} from "../types";
import { getPlanById } from "./plan";
import { createBillingRepositories } from "./repository";
import { getUserSubscription } from "./subscription";
import type { InvoiceEventFilter, InvoiceFilter } from "./types";

type InvoiceRejection = Extract<InvoiceCreationPlan, { action: "reject" }>;

export type CreateInvoiceResult =
	| {
			status: "rejected";
			reason: InvoiceRejection["reason"];
			currentTier: string;
			targetPlan: ApiPlan;
	  }
	| { status: "plan_not_found"; planId: string }
	| { status: "gateway_error"; message: string }
	| {
			status: "created";
			invoice: TransactionInvoice;
			prorationDetails: TransactionInvoice["proration_details"];
	  };

export interface CreateInvoiceInput {
	userId: string;
	user: { id: string; name?: string | null; email?: string | null };
	planId: string;
	dueInDays?: number;
	notes?: string;
	customer?: { name?: string; email?: string };
}

export interface CreateUpgradeInvoiceInput {
	userId: string;
	user: { id: string; name?: string | null; email?: string | null };
	targetTier: string;
	notes?: string;
	customer?: { name?: string; email?: string };
}

/**
 * Generates the next per-year invoice number.
 */
export async function generateInvoiceNumber(
	ctx: GenericEndpointContext,
	prefix?: string
): Promise<string> {
	return createBillingRepositories(ctx).sequences.next(prefix);
}

export async function findInvoiceById(
	ctx: GenericEndpointContext,
	invoiceId: string
): Promise<TransactionInvoice | null> {
	return createBillingRepositories(ctx).invoices.findById(invoiceId);
}

export async function findInvoiceByOrderId(
	ctx: GenericEndpointContext,
	orderId: string
): Promise<TransactionInvoice | null> {
	return createBillingRepositories(ctx).invoices.findByOrderId(orderId);
}

export async function createInvoiceRecord(
	ctx: GenericEndpointContext,
	data: TransactionInvoice
): Promise<TransactionInvoice> {
	return createBillingRepositories(ctx).invoices.create(data);
}

export async function recordInvoiceEvent(
	ctx: GenericEndpointContext,
	eventName: string,
	eventJson: Record<string, unknown>
): Promise<void> {
	return createBillingRepositories(ctx).events.record(eventName, eventJson);
}

export async function listInvoices(
	ctx: GenericEndpointContext,
	filter?: InvoiceFilter
): Promise<TransactionInvoice[]> {
	return createBillingRepositories(ctx).invoices.findMany(filter);
}

export async function listInvoiceEvents(
	ctx: GenericEndpointContext,
	filter?: InvoiceEventFilter
): Promise<TransactionInvoiceEvent[]> {
	return createBillingRepositories(ctx).events.findMany(filter);
}

/**
 * Best-effort status sync with Midtrans for pending/published invoices.
 * Upstream failures are swallowed so reads never fail because of the gateway.
 */
export async function syncInvoiceWithMidtrans(
	ctx: GenericEndpointContext,
	client: MidtransClient,
	invoice: TransactionInvoice
): Promise<TransactionInvoice> {
	if (invoice.status !== "pending" && invoice.status !== "published") {
		return invoice;
	}

	try {
		const { data } = await client.invoice.get(invoice.invoice_id);
		const update = resolveInvoiceSyncUpdate(data, invoice);

		if (update) {
			await createBillingRepositories(ctx).invoices.update(
				invoice.invoice_id,
				update
			);
			Object.assign(invoice, update);
		}
	} catch {
		// Fall through safely if Midtrans upstream is temporarily unreachable.
	}

	return invoice;
}

function rejectionToResult(rejection: InvoiceRejection): CreateInvoiceResult {
	return {
		status: "rejected",
		reason: rejection.reason,
		currentTier: rejection.currentTier,
		targetPlan: rejection.targetPlan,
	};
}

function resolveCustomerName(
	input: { name?: string | null },
	fallback?: string | null
): string {
	return input.name ?? fallback ?? "Customer";
}

/**
 * Application service behind `POST /payment/create-invoice`.
 * Validates the plan transition, creates the Midtrans invoice, persists the
 * local record and runs the `onInvoiceCreated` hook.
 */
export async function createInvoiceForUser(
	ctx: GenericEndpointContext,
	client: MidtransClient,
	input: CreateInvoiceInput,
	opts?: BillingPluginOptions
): Promise<CreateInvoiceResult> {
	const targetPlanId = input.planId.toLowerCase();
	const targetPlan = await getPlanById(ctx, targetPlanId);

	if (!targetPlan) {
		return { status: "plan_not_found", planId: input.planId };
	}

	const existingSubscription = await getUserSubscription(ctx, input.userId);
	const currentTier = existingSubscription?.plan_id?.toLowerCase() ?? "free";
	const currentPlan = await getPlanById(ctx, currentTier);

	const decision = planInvoiceChange({
		currentSubscription: existingSubscription,
		currentPlan,
		targetPlan,
		defaultDueDays: opts?.defaultDueDays,
	});

	if (decision.action === "reject") {
		return rejectionToResult(decision);
	}

	const repositories = createBillingRepositories(ctx);
	const orderId = client.merchant.generateOrderId(input.userId);
	const invoiceNumber = await repositories.sequences.next();

	const customerDetails = {
		id: input.userId,
		name: resolveCustomerName(
			{ name: input.customer?.name },
			input.user.name
		),
		email: input.customer?.email ?? input.user.email ?? undefined,
	};
	const itemDetails = [
		{
			item_id: targetPlan.plan_id,
			description: decision.itemDescription,
			price: decision.payableAmount,
			quantity: 1,
		},
	];

	const notes =
		input.notes ||
		(decision.invoiceType === INVOICE_TYPE.UPGRADE
			? `Mid-cycle upgrade to ${targetPlan.name}.`
			: `Subscription for ${targetPlan.name} (${targetPlan.price.interval})`);

	const { data, error } = await client.invoice.create(
		{
			order_id: orderId,
			invoice_number: invoiceNumber,
			payment_type: "payment_link",
			invoice_date: decision.invoiceDate,
			due_date: decision.dueDate,
			customer_details: customerDetails,
			notes,
			item_details: itemDetails,
		},
		{ idempotencyKey: orderId }
	);

	if (error || !data) {
		return {
			status: "gateway_error",
			message:
				error?.error_messages?.join("; ") ||
				"Failed to create Midtrans invoice.",
		};
	}

	const invoice = buildInvoiceRecord({
		midtrans: data as MidtransInvoiceResult,
		userId: input.userId,
		orderId,
		invoiceType: decision.invoiceType,
		targetTier: targetPlan.plan_id,
		invoiceNumber,
		invoiceDate: decision.invoiceDate,
		dueDate: decision.dueDate,
		grossAmount: decision.payableAmount,
		customerDetails,
		itemDetails,
		prorationDetails: decision.prorationDetails,
	});

	const stored = await createInvoiceRecord(ctx, invoice);
	await opts?.onInvoiceCreated?.(stored, ctx);

	return {
		status: "created",
		invoice: stored,
		prorationDetails: decision.prorationDetails,
	};
}

/**
 * Application service behind `POST /subscription/upgrade`.
 */
export async function createUpgradeInvoiceForUser(
	ctx: GenericEndpointContext,
	client: MidtransClient,
	input: CreateUpgradeInvoiceInput,
	opts?: BillingPluginOptions
): Promise<CreateInvoiceResult> {
	const targetPlanId = input.targetTier.toLowerCase();
	const targetPlan = await getPlanById(ctx, targetPlanId);

	if (!targetPlan) {
		return { status: "plan_not_found", planId: input.targetTier };
	}

	const existingSubscription = await getUserSubscription(ctx, input.userId);
	const currentTier = existingSubscription?.plan_id?.toLowerCase() ?? "free";
	const currentPlan = await getPlanById(ctx, currentTier);

	const decision = planUpgradeInvoice({
		currentSubscription: existingSubscription,
		currentPlan,
		targetPlan,
	});

	if (decision.action === "reject") {
		return rejectionToResult(decision);
	}

	const repositories = createBillingRepositories(ctx);
	const orderId = client.merchant.generateOrderId(input.userId);
	const invoiceNumber = await repositories.sequences.next();

	const customerDetails = {
		id: input.userId,
		name: resolveCustomerName(
			{ name: input.customer?.name },
			input.user.name
		),
		email: input.customer?.email ?? input.user.email ?? undefined,
	};
	const itemDetails = [
		{
			item_id: targetPlan.plan_id,
			description: decision.itemDescription,
			price: decision.payableAmount,
			quantity: 1,
		},
	];

	const { data, error } = await client.invoice.create(
		{
			order_id: orderId,
			invoice_number: invoiceNumber,
			payment_type: "payment_link",
			invoice_date: decision.invoiceDate,
			due_date: decision.dueDate,
			customer_details: customerDetails,
			notes:
				input.notes ||
				`Mid-cycle upgrade to ${targetPlan.name}. Prorated payable: IDR ${decision.payableAmount.toLocaleString()}`,
			item_details: itemDetails,
		},
		{ idempotencyKey: orderId }
	);

	if (error || !data) {
		return {
			status: "gateway_error",
			message:
				error?.error_messages?.join("; ") ||
				"Failed to create Midtrans upgrade invoice.",
		};
	}

	const invoice = buildInvoiceRecord({
		midtrans: data as MidtransInvoiceResult,
		userId: input.userId,
		orderId,
		invoiceType: INVOICE_TYPE.UPGRADE,
		targetTier: targetPlan.plan_id,
		invoiceNumber,
		invoiceDate: decision.invoiceDate,
		dueDate: decision.dueDate,
		grossAmount: decision.payableAmount,
		customerDetails,
		itemDetails,
		prorationDetails: decision.prorationDetails,
	});

	const stored = await createInvoiceRecord(ctx, invoice);
	await opts?.onInvoiceCreated?.(stored, ctx);

	return {
		status: "created",
		invoice: stored,
		prorationDetails: decision.prorationDetails,
	};
}

export type VoidInvoiceResult =
	| { status: "voided"; invoiceId: string }
	| { status: "not_found" }
	| { status: "not_voidable"; invoiceStatus: string }
	| { status: "gateway_error"; message: string };

/**
 * Application service behind `POST /payment/void-invoice`.
 */
export async function voidInvoiceForUser(
	ctx: GenericEndpointContext,
	client: MidtransClient,
	input: { invoiceId: string; actorId: string; reason?: string },
	opts?: BillingPluginOptions
): Promise<VoidInvoiceResult> {
	const invoice = await findInvoiceById(ctx, input.invoiceId);

	if (!invoice) {
		return { status: "not_found" };
	}

	if (!isVoidableStatus(invoice.status)) {
		return { status: "not_voidable", invoiceStatus: invoice.status };
	}

	const { error } = await client.invoice.void(input.invoiceId);

	if (error) {
		return {
			status: "gateway_error",
			message:
				error.error_messages?.join("; ") ||
				"Failed to void Midtrans invoice.",
		};
	}

	const repositories = createBillingRepositories(ctx);
	const updated = await repositories.invoices.update(input.invoiceId, {
		status: "voided",
	});

	await repositories.events.record("invoice.voided", {
		invoice_id: input.invoiceId,
		order_id: invoice.order_id,
		reason: input.reason ?? "User voided invoice",
		voided_by: input.actorId,
	});

	const result = updated ?? { ...invoice, status: "voided" };
	await opts?.onInvoiceVoided?.(result, ctx);

	return { status: "voided", invoiceId: input.invoiceId };
}

export async function voidInvoiceRecord(
	ctx: GenericEndpointContext,
	invoiceId: string
): Promise<TransactionInvoice | null> {
	const repositories = createBillingRepositories(ctx);
	return repositories.invoices.update(invoiceId, { status: "voided" });
}
