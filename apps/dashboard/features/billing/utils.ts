import type { Invoice } from "@itsrose/auth-billing";

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
} from "@/shared/status-props";

export type InvoiceStatusFilter =
	"all" | "paid" | "pending" | "expired" | "void";

export function matchesInvoiceStatus(
	invoice: Invoice,
	filter: InvoiceStatusFilter | string
): boolean {
	if (filter === "all") {
		return true;
	}
	const status = (invoice.status || "").toLowerCase();
	switch (filter) {
		case "paid":
			return status === "paid" || status === "settlement";
		case "pending":
			return status === "pending" || status === "unpaid";
		case "expired":
			return status === "expired" || status === "expire";
		case "void":
			return (
				status === "void" ||
				status === "canceled" ||
				status === "cancelled"
			);
		default:
			return true;
	}
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

export function isPendingInvoice(status: string | null | undefined): boolean {
	const normalized = (status || "").toLowerCase();
	return normalized === "pending" || normalized === "unpaid";
}
