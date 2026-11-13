import type {
	ApiPlan,
	InvoiceType,
	ProrationDetails,
	Subscription,
	TransactionInvoice,
	TransactionInvoiceCustomerDetails,
	TransactionInvoiceItemDetails,
} from "../types";
import {
	DEFAULT_INVOICE_DUE_DAYS,
	DEFAULT_INVOICE_PREFIX,
	INVOICE_TYPE,
	UPGRADE_INVOICE_LIFESPAN_MS,
} from "./constants";
import {
	isPaidInvoiceStatus,
	isVoidableStatus,
	type InvoiceStatus,
} from "./invoice-status";
import {
	calculateProration,
	formatProrationDetails,
	isTierDowngrade,
	isTierUpgrade,
} from "./proration";
import { isNonTerminalStatus } from "./subscription.service";

/**
 * Minimal structural shape of a Midtrans invoice returned by the SDK.
 * Kept structural (instead of the full zod-inferred response) so the domain
 * layer does not depend on the gateway transport types.
 *
 * `status` is already normalised into the domain invoice vocabulary by the
 * gateway adapter — the domain never sees a provider status string.
 */
export type GatewayInvoice = {
	id: string;
	status?: InvoiceStatus | null;
	invoice_date?: string | null;
	due_date?: string | null;
	payment_type?: string | null;
	pdf_url?: string | null;
	paid_pdf_url?: string | null;
	paid_date?: string | null;
	payment_link_url?: string | null;
};

/**
 * Calculates current date and future due date ISO strings.
 */
export function calculateInvoiceDates(
	dueInDays: number = DEFAULT_INVOICE_DUE_DAYS
) {
	const now = new Date();
	const dueDate = new Date(now.getTime() + dueInDays * 24 * 60 * 60 * 1000);

	return {
		invoiceDate: now.toISOString(),
		dueDate: dueDate.toISOString(),
	};
}

/**
 * Formats a standard invoice sequence number.
 * Example: `INV-2026-00000042`
 */
export function formatInvoiceNumber(
	year: number,
	sequence: number,
	prefix: string = DEFAULT_INVOICE_PREFIX
): string {
	const paddedSequence = String(sequence).padStart(8, "0");
	return `${prefix}-${year}-${paddedSequence}`;
}

export type InvoiceChangeRejection =
	"free_tier" | "already_subscribed" | "downgrade";

export type InvoiceCreationPlan =
	| {
			action: "reject";
			reason: InvoiceChangeRejection;
			currentTier: string;
			targetPlan: ApiPlan;
	  }
	| {
			action: "create";
			invoiceType: InvoiceType;
			payableAmount: number;
			invoiceDate: string;
			dueDate: string;
			itemDescription: string;
			prorationDetails: ProrationDetails | null;
	  };

export interface InvoiceChangeInput {
	currentSubscription: Subscription | null;
	currentPlan: ApiPlan | null;
	targetPlan: ApiPlan;
	now?: Date;
	defaultDueDays?: number;
}

/**
 * Pure decision table for `POST /payment/create-invoice`.
 *
 * Handles the "already subscribed", downgrade, free tier and mid-cycle
 * proration rules without touching the database or HTTP context.
 */
export function planInvoiceChange(
	input: InvoiceChangeInput
): InvoiceCreationPlan {
	const now = input.now ?? new Date();
	const targetTier = input.targetPlan.plan_id.toLowerCase();
	const currentTier =
		input.currentSubscription?.plan_id?.toLowerCase() ?? "free";
	const isActive = input.currentSubscription
		? isNonTerminalStatus(input.currentSubscription.status)
		: false;

	if (targetTier === "free") {
		return {
			action: "reject",
			reason: "free_tier",
			currentTier,
			targetPlan: input.targetPlan,
		};
	}

	if (isActive && currentTier === targetTier) {
		return {
			action: "reject",
			reason: "already_subscribed",
			currentTier,
			targetPlan: input.targetPlan,
		};
	}

	if (isActive && isTierDowngrade(currentTier, targetTier)) {
		return {
			action: "reject",
			reason: "downgrade",
			currentTier,
			targetPlan: input.targetPlan,
		};
	}

	const invoiceDate = now.toISOString();

	if (
		isActive &&
		input.currentSubscription &&
		isTierUpgrade(currentTier, targetTier)
	) {
		const proration = calculateProration({
			currentTier,
			targetTier,
			currentPeriodStart: input.currentSubscription.period_start,
			currentPeriodEnd: input.currentSubscription.period_end,
			currentTierPrice: input.currentPlan?.price.amount ?? 0,
			targetTierPrice: input.targetPlan.price.amount,
			now,
		});

		return {
			action: "create",
			invoiceType: INVOICE_TYPE.UPGRADE,
			payableAmount: proration.payableAmount,
			invoiceDate,
			dueDate: new Date(
				now.getTime() + UPGRADE_INVOICE_LIFESPAN_MS
			).toISOString(),
			itemDescription: buildProrationItemDescription(
				input.targetPlan,
				input.currentPlan,
				currentTier,
				proration.isCycleReset
			),
			prorationDetails: formatProrationDetails(proration),
		};
	}

	const dueInDays = input.defaultDueDays ?? DEFAULT_INVOICE_DUE_DAYS;

	return {
		action: "create",
		invoiceType: INVOICE_TYPE.NEW,
		payableAmount: input.targetPlan.price.amount,
		invoiceDate,
		dueDate: calculateInvoiceDates(dueInDays).dueDate,
		itemDescription: `${input.targetPlan.name} (${input.targetPlan.price.interval})`,
		prorationDetails: null,
	};
}

/**
 * Pure decision table for `POST /subscription/upgrade`.
 * Always produces an `UPGRADE` invoice (or a rejection), never a renewal one.
 */
export function planUpgradeInvoice(
	input: InvoiceChangeInput
): InvoiceCreationPlan {
	const now = input.now ?? new Date();
	const targetTier = input.targetPlan.plan_id.toLowerCase();
	const currentTier =
		input.currentSubscription?.plan_id?.toLowerCase() ?? "free";

	if (targetTier === "free") {
		return {
			action: "reject",
			reason: "free_tier",
			currentTier,
			targetPlan: input.targetPlan,
		};
	}

	if (currentTier === targetTier) {
		return {
			action: "reject",
			reason: "already_subscribed",
			currentTier,
			targetPlan: input.targetPlan,
		};
	}

	if (isTierDowngrade(currentTier, targetTier)) {
		return {
			action: "reject",
			reason: "downgrade",
			currentTier,
			targetPlan: input.targetPlan,
		};
	}

	const proration = calculateProration({
		currentTier,
		targetTier,
		currentPeriodStart: input.currentSubscription?.period_start ?? now,
		currentPeriodEnd: input.currentSubscription?.period_end ?? now,
		currentTierPrice: input.currentPlan?.price.amount ?? 0,
		targetTierPrice: input.targetPlan.price.amount,
		now,
	});

	return {
		action: "create",
		invoiceType: INVOICE_TYPE.UPGRADE,
		payableAmount: proration.payableAmount,
		invoiceDate: now.toISOString(),
		dueDate: new Date(
			now.getTime() + UPGRADE_INVOICE_LIFESPAN_MS
		).toISOString(),
		itemDescription: buildProrationItemDescription(
			input.targetPlan,
			input.currentPlan,
			currentTier,
			proration.isCycleReset
		),
		prorationDetails: formatProrationDetails(proration),
	};
}

export function buildProrationItemDescription(
	targetPlan: ApiPlan,
	currentPlan: ApiPlan | null,
	currentTier: string,
	isCycleReset: boolean
): string {
	if (isCycleReset) {
		return `${targetPlan.name} (Full Cycle Reset)`;
	}

	return `${targetPlan.name} (Prorated Upgrade from ${currentPlan?.name ?? currentTier})`;
}

export function buildInvoiceItemDetails(
	plan: ApiPlan,
	description: string,
	price: number
): TransactionInvoiceItemDetails[] {
	return [
		{
			item_id: plan.plan_id,
			description,
			price,
			quantity: 1,
		},
	];
}

export function buildInvoiceCustomerDetails(input: {
	id: string;
	name?: string | null;
	email?: string | null;
	phone?: string | null;
}): TransactionInvoiceCustomerDetails {
	return {
		id: input.id,
		name: input.name ?? null,
		email: input.email ?? null,
		phone: input.phone ?? null,
	};
}

export interface BuildInvoiceRecordInput {
	midtrans: GatewayInvoice;
	userId: string;
	orderId: string;
	invoiceType: InvoiceType;
	targetTier: string;
	invoiceNumber: string;
	invoiceDate: string;
	dueDate: string;
	grossAmount: number;
	customerDetails: TransactionInvoiceCustomerDetails;
	itemDetails: TransactionInvoiceItemDetails[];
	prorationDetails?: ProrationDetails | null;
}

/**
 * Maps a Midtrans response plus local accounting data into the row persisted in
 * `transaction_invoices`.
 */
export function buildInvoiceRecord(
	input: BuildInvoiceRecordInput
): TransactionInvoice {
	return {
		invoice_id: input.midtrans.id,
		user_id: input.userId,
		order_id: input.orderId,
		invoice_type: input.invoiceType,
		target_tier: input.targetTier,
		status: input.midtrans.status || "pending",
		invoice_date: input.midtrans.invoice_date || input.invoiceDate,
		due_date: input.midtrans.due_date || input.dueDate,
		invoice_number: input.invoiceNumber,
		payment_type: input.midtrans.payment_type || "payment_link",
		pdf_url: input.midtrans.pdf_url ?? null,
		paid_pdf_url: input.midtrans.paid_pdf_url ?? null,
		paid_date: input.midtrans.paid_date ?? null,
		gross_amount: input.grossAmount,
		payment_link_url: input.midtrans.payment_link_url ?? null,
		customer_details: input.customerDetails,
		item_details: input.itemDetails,
		proration_details: input.prorationDetails ?? null,
	};
}

export { isPaidInvoiceStatus, isVoidableStatus };

/**
 * Computes the local invoice fields that should be synced from a remote
 * Midtrans invoice, or `null` when nothing changed.
 */
export function resolveInvoiceSyncUpdate(
	remote: GatewayInvoice | null | undefined,
	existing: TransactionInvoice
): Partial<TransactionInvoice> | null {
	if (!remote || !remote.status || remote.status === existing.status) {
		return null;
	}

	return {
		status: remote.status,
		pdf_url: remote.pdf_url ?? existing.pdf_url,
		paid_pdf_url: remote.paid_pdf_url ?? existing.paid_pdf_url,
		paid_date: remote.paid_date ?? existing.paid_date,
	};
}

export function sortInvoicesByDate(
	invoices: readonly TransactionInvoice[]
): TransactionInvoice[] {
	return [...invoices].sort((a, b) => {
		const dateA = new Date(a.invoice_date || 0).getTime();
		const dateB = new Date(b.invoice_date || 0).getTime();
		return dateB - dateA;
	});
}
