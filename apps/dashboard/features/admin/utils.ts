import {
	formatDateID,
	formatDateTimeID,
	formatIDR,
} from "@itsrose/auth-billing/client";

export { formatDateID, formatDateTimeID, formatIDR };
export {
	getInvoiceStatusProps,
	getInvoiceTypeProps,
	getSubscriptionStatusProps,
} from "@/shared/status-props";

const numberFormatter = new Intl.NumberFormat("id-ID");

/**
 * Groups digits for admin readouts (quotas, request counts).
 */
export function formatUsageNumber(value: number | null | undefined): string {
	if (value === null || value === undefined || !Number.isFinite(value)) {
		return "—";
	}
	return numberFormatter.format(Math.max(0, Math.trunc(value)));
}

export function formatUnitsMicro(value: number | null | undefined): string {
	if (value === null || value === undefined || !Number.isFinite(value)) {
		return "—";
	}
	const whole = value / 1_000_000;
	return new Intl.NumberFormat("id-ID", {
		maximumFractionDigits: 3,
	}).format(whole);
}

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

export type SettlementStatusProps = {
	label: string;
	color: "default" | "success" | "warning" | "danger";
};

export function getSettlementStatusProps(
	status: "settled" | "skipped" | "failed" | string
): SettlementStatusProps {
	switch (status) {
		case "settled":
			return { label: "Settled", color: "success" };
		case "skipped":
			return { label: "Skipped", color: "warning" };
		case "failed":
			return { label: "Failed", color: "danger" };
		default:
			return { label: status || "Unknown", color: "default" };
	}
}
