import type { InvoiceType, SubscriptionStatus } from "@itsrose/auth-billing";

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

export function getSubscriptionStatusProps(
	status?: SubscriptionStatus | string | null
): {
	label: string;
	color: "success" | "warning" | "danger" | "default" | "accent";
} {
	const normalized = (status || "").toLowerCase().trim();

	switch (normalized) {
		case "active":
			return { label: "Active", color: "success" };
		case "pending_payment":
			return { label: "Pending Payment", color: "warning" };
		case "past_due":
			return { label: "Past Due", color: "warning" };
		case "expired":
			return { label: "Expired", color: "danger" };
		case "canceled":
		case "cancelled":
			return { label: "Canceled", color: "danger" };
		default:
			return {
				label: normalized ? normalized.toUpperCase() : "Active",
				color: "default",
			};
	}
}

export function getInvoiceStatusProps(status?: string | null): {
	label: string;
	color: "success" | "warning" | "danger" | "default";
} {
	const normalized = (status || "").toLowerCase().trim();

	switch (normalized) {
		case "paid":
		case "settlement":
			return { label: "Paid", color: "success" };
		case "pending":
		case "unpaid":
			return { label: "Pending", color: "warning" };
		case "expired":
		case "expire":
			return { label: "Expired", color: "danger" };
		case "failed":
		case "deny":
			return { label: "Failed", color: "danger" };
		case "void":
		case "canceled":
		case "cancelled":
			return { label: "Void", color: "default" };
		default:
			return {
				label: normalized ? normalized.toUpperCase() : "Unknown",
				color: "default",
			};
	}
}

export function getInvoiceTypeProps(type?: InvoiceType | string | null): {
	label: string;
	color: "accent" | "default" | "success" | "warning";
} {
	const normalized = (type || "").toUpperCase().trim();

	switch (normalized) {
		case "UPGRADE":
			return { label: "Upgrade", color: "accent" };
		case "RENEWAL":
			return { label: "Renewal", color: "default" };
		case "NEW":
			return { label: "New", color: "default" };
		default:
			return {
				label: normalized || "Standard",
				color: "default",
			};
	}
}
