import type { Invoice, InvoiceStatus } from "@itsrose/auth-billing";

export {
	formatDateID,
	formatIDR,
	calculateProrationPreview,
	formatDateTimeID,
	isDowngrade,
	isUpgrade,
	type ProrationPreviewInput,
	type ProrationPreviewResult,
} from "@itsrose/auth-billing/client";

export {
	getInvoiceStatusProps,
	getInvoiceTypeProps,
	getSubscriptionStatusProps,
	isPendingInvoice,
} from "@/shared/status-props";

/**
 * The invoice status buckets offered by the invoice table filter.
 *
 * `void` is a UI bucket, not a status: it groups the domain states that close
 * an invoice without payment (`voided` and `canceled`).
 */
export type InvoiceStatusFilter =
	"all" | "paid" | "pending" | "expired" | "void";

const STATUS_BY_FILTER: Record<
	Exclude<InvoiceStatusFilter, "all">,
	readonly InvoiceStatus[]
> = {
	paid: ["paid"],
	pending: ["pending"],
	expired: ["expired"],
	void: ["voided", "canceled"],
};

function isInvoiceStatusFilter(
	value: string
): value is Exclude<InvoiceStatusFilter, "all"> {
	return Object.prototype.hasOwnProperty.call(STATUS_BY_FILTER, value);
}

/**
 * Whether an invoice belongs to the selected status bucket.
 *
 * The invoice status is compared against the domain invoice vocabulary only.
 * Provider statuses (Midtrans transaction statuses such as `settlement`) are
 * translated into that vocabulary by the billing package before they reach
 * this point, so the dashboard never has to compensate for them.
 */
export function matchesInvoiceStatus(
	invoice: Invoice,
	filter: InvoiceStatusFilter | string
): boolean {
	if (filter === "all") {
		return true;
	}

	if (!isInvoiceStatusFilter(filter)) {
		return true;
	}

	return STATUS_BY_FILTER[filter].includes(invoice.status);
}

export function matchesInvoiceSearch(invoice: Invoice, query: string): boolean {
	const needle = query.trim().toLowerCase();
	if (!needle) {
		return true;
	}
	return Boolean(
		invoice.order_id?.toLowerCase().includes(needle) ||
		invoice.invoice_id?.toLowerCase().includes(needle) ||
		invoice.invoice_number?.toLowerCase().includes(needle) ||
		invoice.target_tier?.toLowerCase().includes(needle) ||
		invoice.invoice_type?.toLowerCase().includes(needle)
	);
}
