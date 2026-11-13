import type {
	InvoiceStatus,
	InvoiceType,
	SubscriptionStatus,
} from "@itsrose/auth-billing";

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

/**
 * Presentation of an invoice status.
 *
 * The invoice status is always one of the domain vocabulary states; the
 * billing package normalises provider statuses before they reach the UI, so
 * there are no provider aliases to compensate for here.
 */
export function getInvoiceStatusProps(
	status?: InvoiceStatus | string | null
): InvoiceStatusProps {
	const normalized = (status || "").toLowerCase().trim();

	switch (normalized) {
		case "paid":
			return { label: "Paid", color: "success" };
		case "pending":
		case "published":
		case "overdue":
			return { label: "Pending", color: "warning" };
		case "draft":
			return { label: "Draft", color: "default" };
		case "expired":
			return { label: "Expired", color: "danger" };
		case "rejected":
			return { label: "Rejected", color: "danger" };
		case "voided":
		case "canceled":
			return { label: "Void", color: "default" };
		default:
			return {
				label: normalized ? normalized.toUpperCase() : "Unknown",
				color: "default",
			};
	}
}

/**
 * Whether an invoice is still awaiting payment.
 *
 * The single place the dashboard answers that question. The invoice status is
 * always one of the domain vocabulary states — the billing package translates
 * the provider status before it reaches the client — so there is no provider
 * spelling to compensate for.
 */
export function isPendingInvoice(
	status?: InvoiceStatus | string | null
): boolean {
	return status === "pending";
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
