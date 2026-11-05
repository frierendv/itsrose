import { INVOICE_TYPE } from "../domain/constants";
import {
	buildInvoiceRecord,
	calculateInvoiceDates,
	isVoidableStatus,
	planInvoiceChange,
	planUpgradeInvoice,
	resolveInvoiceSyncUpdate,
	type InvoiceCreationPlan,
} from "../domain/invoice.service";
import type {
	BillingDependencies,
	BillingServiceOptions,
	InvoiceEventFilter,
	InvoiceFilter,
} from "../domain/ports";
import type {
	ApiPlan,
	TransactionInvoice,
	TransactionInvoiceEvent,
	TransactionInvoiceItemDetails,
} from "../types";
import { getPlanById } from "./plan.service";
import { getUserSubscription } from "./subscription.service";

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
	dependencies: Pick<BillingDependencies, "repositories">,
	prefix?: string
): Promise<string> {
	return dependencies.repositories.sequences.next(prefix);
}

export async function findInvoiceById(
	dependencies: Pick<BillingDependencies, "repositories">,
	invoiceId: string
): Promise<TransactionInvoice | null> {
	return dependencies.repositories.invoices.findById(invoiceId);
}

export async function findInvoiceByOrderId(
	dependencies: Pick<BillingDependencies, "repositories">,
	orderId: string
): Promise<TransactionInvoice | null> {
	return dependencies.repositories.invoices.findByOrderId(orderId);
}

export async function createInvoiceRecord(
	dependencies: Pick<BillingDependencies, "repositories">,
	data: TransactionInvoice
): Promise<TransactionInvoice> {
	return dependencies.repositories.invoices.create(data);
}

export async function recordInvoiceEvent(
	dependencies: Pick<BillingDependencies, "repositories" | "clock">,
	eventName: string,
	eventJson: Record<string, unknown>
): Promise<void> {
	return dependencies.repositories.events.record(
		eventName,
		eventJson,
		dependencies.clock.now()
	);
}

export async function listInvoices(
	dependencies: Pick<BillingDependencies, "repositories">,
	filter?: InvoiceFilter
): Promise<TransactionInvoice[]> {
	return dependencies.repositories.invoices.findMany(filter);
}

export async function listInvoiceEvents(
	dependencies: Pick<BillingDependencies, "repositories">,
	filter?: InvoiceEventFilter
): Promise<TransactionInvoiceEvent[]> {
	return dependencies.repositories.events.findMany(filter);
}

/**
 * Best-effort status sync with the payment provider for pending/published
 * invoices. Upstream failures are swallowed so reads never fail because of the
 * gateway.
 */
export async function syncInvoiceWithMidtrans(
	dependencies: Pick<BillingDependencies, "repositories" | "gateway">,
	invoice: TransactionInvoice
): Promise<TransactionInvoice> {
	if (invoice.status !== "pending" && invoice.status !== "published") {
		return invoice;
	}

	try {
		const remote = await dependencies.gateway.getInvoice(
			invoice.invoice_id
		);
		const update = resolveInvoiceSyncUpdate(remote, invoice);

		if (update) {
			await dependencies.repositories.invoices.update(
				invoice.invoice_id,
				update
			);
			Object.assign(invoice, update);
		}
	} catch {
		// Fall through safely if the provider is temporarily unreachable.
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

function buildCustomerPayload(input: {
	userId: string;
	user: { name?: string | null; email?: string | null };
	customer?: { name?: string; email?: string };
}): { id: string; name: string; email?: string } {
	return {
		id: input.userId,
		name: resolveCustomerName(
			{ name: input.customer?.name },
			input.user.name
		),
		email: input.customer?.email ?? input.user.email ?? undefined,
	};
}

/**
 * Application service behind `POST /payment/create-invoice`.
 * Validates the plan transition, creates the provider invoice, persists the
 * local record and runs the `onInvoiceCreated` hook.
 */
export async function createInvoiceForUser(
	dependencies: BillingDependencies,
	input: CreateInvoiceInput,
	options?: BillingServiceOptions
): Promise<CreateInvoiceResult> {
	const targetPlanId = input.planId.toLowerCase();
	const targetPlan = await getPlanById(
		dependencies.repositories.plans,
		targetPlanId
	);

	if (!targetPlan) {
		return { status: "plan_not_found", planId: input.planId };
	}

	const existingSubscription = await getUserSubscription(
		dependencies.repositories.subscriptions,
		input.userId
	);
	const currentTier = existingSubscription?.plan_id?.toLowerCase() ?? "free";
	const currentPlan = await getPlanById(
		dependencies.repositories.plans,
		currentTier
	);

	const decision = planInvoiceChange({
		currentSubscription: existingSubscription,
		currentPlan,
		targetPlan,
		now: dependencies.clock.now(),
		defaultDueDays: options?.defaultDueDays,
	});

	if (decision.action === "reject") {
		return rejectionToResult(decision);
	}

	const orderId = dependencies.gateway.generateOrderId(input.userId);
	const invoiceNumber = await dependencies.repositories.sequences.next();
	const customerDetails = buildCustomerPayload(input);
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

	const gatewayResult = await dependencies.gateway.createInvoice(
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

	if (!gatewayResult.ok) {
		return { status: "gateway_error", message: gatewayResult.message };
	}

	const invoice = buildInvoiceRecord({
		midtrans: gatewayResult.data,
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

	const stored = await createInvoiceRecord(dependencies, invoice);
	await options?.hooks?.onInvoiceCreated?.(stored);

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
	dependencies: BillingDependencies,
	input: CreateUpgradeInvoiceInput,
	options?: BillingServiceOptions
): Promise<CreateInvoiceResult> {
	const targetPlanId = input.targetTier.toLowerCase();
	const targetPlan = await getPlanById(
		dependencies.repositories.plans,
		targetPlanId
	);

	if (!targetPlan) {
		return { status: "plan_not_found", planId: input.targetTier };
	}

	const existingSubscription = await getUserSubscription(
		dependencies.repositories.subscriptions,
		input.userId
	);
	const currentTier = existingSubscription?.plan_id?.toLowerCase() ?? "free";
	const currentPlan = await getPlanById(
		dependencies.repositories.plans,
		currentTier
	);

	const decision = planUpgradeInvoice({
		currentSubscription: existingSubscription,
		currentPlan,
		targetPlan,
		now: dependencies.clock.now(),
	});

	if (decision.action === "reject") {
		return rejectionToResult(decision);
	}

	const orderId = dependencies.gateway.generateOrderId(input.userId);
	const invoiceNumber = await dependencies.repositories.sequences.next();
	const customerDetails = buildCustomerPayload(input);
	const itemDetails = [
		{
			item_id: targetPlan.plan_id,
			description: decision.itemDescription,
			price: decision.payableAmount,
			quantity: 1,
		},
	];

	const gatewayResult = await dependencies.gateway.createInvoice(
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

	if (!gatewayResult.ok) {
		return { status: "gateway_error", message: gatewayResult.message };
	}

	const invoice = buildInvoiceRecord({
		midtrans: gatewayResult.data,
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

	const stored = await createInvoiceRecord(dependencies, invoice);
	await options?.hooks?.onInvoiceCreated?.(stored);

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
	dependencies: BillingDependencies,
	input: { invoiceId: string; actorId: string; reason?: string },
	options?: BillingServiceOptions
): Promise<VoidInvoiceResult> {
	const invoice = await findInvoiceById(dependencies, input.invoiceId);

	if (!invoice) {
		return { status: "not_found" };
	}

	if (!isVoidableStatus(invoice.status)) {
		return { status: "not_voidable", invoiceStatus: invoice.status };
	}

	const gatewayResult = await dependencies.gateway.voidInvoice(
		input.invoiceId
	);

	if (!gatewayResult.ok) {
		return { status: "gateway_error", message: gatewayResult.message };
	}

	const updated = await dependencies.repositories.invoices.update(
		input.invoiceId,
		{ status: "voided" }
	);

	await dependencies.repositories.events.record(
		"invoice.voided",
		{
			invoice_id: input.invoiceId,
			order_id: invoice.order_id,
			reason: input.reason ?? "User voided invoice",
			voided_by: input.actorId,
		},
		dependencies.clock.now()
	);

	const result = updated ?? { ...invoice, status: "voided" };
	await options?.hooks?.onInvoiceVoided?.(result);

	return { status: "voided", invoiceId: input.invoiceId };
}

/* -------------------------------------------------------------------------- */
/*                            Usage settlement                                */
/* -------------------------------------------------------------------------- */

export interface CreateUsageInvoiceInput {
	userId: string;
	user: { id: string; name?: string | null; email?: string | null };
	tenantId: string;
	/** `YYYY-MM` settled period. */
	period: string;
	unit: string;
	lines: TransactionInvoiceItemDetails[];
	grossAmount: number;
	/** Stable key so retries map to the same provider invoice. */
	idempotencyKey: string;
	notes?: string;
	dueInDays?: number;
}

export type CreateUsageInvoiceResult =
	| { status: "created"; invoice: TransactionInvoice }
	| { status: "gateway_error"; message: string };

/**
 * Creates the provider invoice for a settled usage period.
 *
 * Distinct from `createInvoiceForUser`: there is no plan transition, no
 * proration and no rejection table. The provider idempotency key is derived
 * from the settlement identity (`tenant + period + unit`), so retrying a
 * failed settlement cannot issue a second invoice.
 */
export async function createUsageInvoice(
	dependencies: BillingDependencies,
	input: CreateUsageInvoiceInput,
	options?: BillingServiceOptions
): Promise<CreateUsageInvoiceResult> {
	const orderId = buildUsageOrderId(input);
	const invoiceNumber = await dependencies.repositories.sequences.next();
	const { invoiceDate, dueDate } = calculateInvoiceDates(
		input.dueInDays ?? options?.defaultDueDays
	);
	const customerDetails = buildCustomerPayload({
		userId: input.userId,
		user: input.user,
	});

	const itemDetails = input.lines.map((line) => ({
		item_id: line.item_id,
		description: line.description ?? "",
		price: line.price,
		quantity: line.quantity,
	}));

	const gatewayResult = await dependencies.gateway.createInvoice(
		{
			order_id: orderId,
			invoice_number: invoiceNumber,
			payment_type: "payment_link",
			invoice_date: invoiceDate,
			due_date: dueDate,
			customer_details: customerDetails,
			notes:
				input.notes ??
				`API usage settlement for ${input.period} (${input.unit})`,
			item_details: itemDetails,
		},
		{ idempotencyKey: input.idempotencyKey }
	);

	if (!gatewayResult.ok) {
		return { status: "gateway_error", message: gatewayResult.message };
	}

	const invoice = buildInvoiceRecord({
		midtrans: gatewayResult.data,
		userId: input.userId,
		orderId,
		invoiceType: INVOICE_TYPE.USAGE,
		targetTier: "usage",
		invoiceNumber,
		invoiceDate,
		dueDate,
		grossAmount: input.grossAmount,
		customerDetails,
		itemDetails,
		prorationDetails: null,
	});

	const stored = await createInvoiceRecord(dependencies, invoice);
	await options?.hooks?.onInvoiceCreated?.(stored);

	return { status: "created", invoice: stored };
}

/**
 * Deterministic order id for a usage settlement, safe for payment providers
 * that restrict order ids to alphanumerics and dashes.
 */
export function buildUsageOrderId(input: {
	tenantId: string;
	period: string;
	unit: string;
}): string {
	const tenantPart = input.tenantId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8);
	const unitPart = input.unit.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8);
	return `usage-${input.period}-${tenantPart}-${unitPart}`;
}
