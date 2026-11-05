import type { InvoiceType, SubscriptionStatus } from "@itsrose/auth-billing";

/**
 * Canonical presentation mapping for billing states, shared by the
 * customer-facing billing feature and the admin feature.
 */

export type StatusColor = "success" | "warning" | "danger" | "default";

export type SubscriptionStatusProps = {
	label: string;
	color: StatusColor | "accent";
};

export function getSubscriptionStatusProps(
	status?: SubscriptionStatus | string | null
): SubscriptionStatusProps {
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

export type InvoiceStatusProps = {
	label: string;
	color: StatusColor;
};

export function getInvoiceStatusProps(
	status?: string | null
): InvoiceStatusProps {
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
		case "voided":
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

export type InvoiceTypeProps = {
	label: string;
	color: StatusColor | "accent";
};

export function getInvoiceTypeProps(
	type?: InvoiceType | string | null
): InvoiceTypeProps {
	const normalized = (type || "").toUpperCase().trim();

	switch (normalized) {
		case "UPGRADE":
			return { label: "Upgrade", color: "accent" };
		case "NEW":
			return { label: "New", color: "accent" };
		case "RENEWAL":
			return { label: "Renewal", color: "default" };
		default:
			return {
				label: normalized || "Standard",
				color: "default",
			};
	}
}
