import {
	formatDateID,
	formatDateTimeID,
	formatIDR,
} from "@itsrose/auth/itsrose/client";
import type { InvoiceType, SubscriptionStatus } from "./types";

export { formatDateID, formatDateTimeID, formatIDR };

export function formatDate(date: string | Date | null | undefined): string {
	if (!date) {
		return "-";
	}
	return formatDateID(date);
}

export function formatDateTime(date: string | Date | null | undefined): string {
	if (!date) {
		return "-";
	}
	return formatDateTimeID(date);
}

export function getSubscriptionStatusProps(
	status?: SubscriptionStatus | string | null
): {
	label: string;
	color: "success" | "warning" | "danger" | "default";
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
			return { label: "Canceled", color: "default" };
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
		case "voided":
		case "canceled":
		case "cancelled":
			return { label: "Void", color: "danger" };
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
			return { label: "New", color: "accent" };
		default:
			return {
				label: normalized || "Standard",
				color: "default",
			};
	}
}

export function getEventStatusProps(eventName?: string | null): {
	label: string;
	color: "default" | "success" | "warning" | "danger";
} {
	const normalized = (eventName || "").toLowerCase().trim();

	if (
		normalized.endsWith(".settlement") ||
		normalized.endsWith(".success") ||
		normalized === "settlement" ||
		normalized === "success"
	) {
		return { label: eventName || "Success", color: "success" };
	}

	if (
		normalized.endsWith(".failed") ||
		normalized.endsWith(".voided") ||
		normalized === "invoice.voided" ||
		normalized.includes("failed") ||
		normalized.includes("void")
	) {
		return { label: eventName || "Failed", color: "danger" };
	}

	if (
		normalized.endsWith(".pending") ||
		normalized.endsWith(".not_found") ||
		normalized.includes("not_found") ||
		normalized.includes("pending")
	) {
		return { label: eventName || "Pending", color: "warning" };
	}

	return {
		label: eventName || "Unknown",
		color: "default",
	};
}

export function extractEventIdentifiers(
	eventJson?: Record<string, unknown> | null
): {
	orderId: string | null;
	invoiceId: string | null;
} {
	if (!eventJson) {
		return { orderId: null, invoiceId: null };
	}

	const payload =
		eventJson.payload && typeof eventJson.payload === "object"
			? (eventJson.payload as Record<string, unknown>)
			: {};

	const orderId =
		(typeof eventJson.order_id === "string" ? eventJson.order_id : null) ||
		(typeof payload.order_id === "string" ? payload.order_id : null);

	const invoiceId =
		(typeof eventJson.invoice_id === "string"
			? eventJson.invoice_id
			: null) ||
		(typeof payload.invoice_id === "string" ? payload.invoice_id : null);

	return { orderId, invoiceId };
}
