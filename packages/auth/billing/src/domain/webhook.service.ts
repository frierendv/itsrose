import type { InvoiceType, TransactionInvoice } from "../types";
import { INVOICE_TYPE } from "./constants";
import type { GatewayInvoice } from "./invoice.service";

export type WebhookPayload = Record<string, unknown>;

export type WebhookInvoiceIdSource = {
	metadata?: { midtrans_invoice_id?: string } | null;
};

export function resolveWebhookInvoiceId(
	parsed: WebhookInvoiceIdSource | null
): string | undefined {
	const fromMetadata = parsed?.metadata?.midtrans_invoice_id;
	if (typeof fromMetadata === "string" && fromMetadata.length > 0) {
		return fromMetadata;
	}

	return undefined;
}

export function readOrderId(payload: WebhookPayload): string | undefined {
	return typeof payload.order_id === "string" ? payload.order_id : undefined;
}

/**
 * A webhook is a duplicate when the local invoice already recorded a `paid`
 * status. Re-applying it would advance the billing cycle twice.
 */
export function isDuplicatePaidWebhook(invoice: TransactionInvoice): boolean {
	return invoice.status === "paid";
}

export type SettlementKind = "upgrade" | "renewal" | "new";

export function resolveSettlementKind(
	invoiceType: InvoiceType
): SettlementKind {
	switch (invoiceType) {
		case INVOICE_TYPE.UPGRADE:
			return "upgrade";
		case INVOICE_TYPE.RENEWAL:
			return "renewal";
		case INVOICE_TYPE.NEW:
		default:
			return "new";
	}
}

export type WebhookNotificationOutcome = {
	finalStatus: string;
	paidDate: string | null;
	invoiceUpdate: Partial<TransactionInvoice>;
	eventName: string;
	eventJson: Record<string, unknown>;
	settlement: SettlementKind;
};

/**
 * Pure mapping of a verified Midtrans notification onto local invoice fields.
 */
export function resolveWebhookNotification(input: {
	existingInvoice: TransactionInvoice;
	remoteData?: GatewayInvoice | null;
	payload: WebhookPayload;
	now?: Date;
}): WebhookNotificationOutcome {
	const { existingInvoice, remoteData, payload } = input;
	const now = input.now ?? new Date();

	const finalStatus =
		remoteData?.status ||
		(typeof payload.transaction_status === "string"
			? payload.transaction_status
			: "pending");
	const paidDate =
		remoteData?.paid_date ||
		(finalStatus === "paid" ? now.toISOString() : null);

	return {
		finalStatus,
		paidDate,
		invoiceUpdate: {
			status: finalStatus,
			pdf_url: remoteData?.pdf_url ?? existingInvoice.pdf_url,
			paid_pdf_url:
				remoteData?.paid_pdf_url ?? existingInvoice.paid_pdf_url,
			paid_date: paidDate ?? existingInvoice.paid_date,
			payment_type:
				remoteData?.payment_type ?? existingInvoice.payment_type,
		},
		eventName: `midtrans.invoice.${finalStatus}`,
		eventJson: {
			invoice_id: existingInvoice.invoice_id,
			order_id: existingInvoice.order_id,
			final_status: finalStatus,
			payload,
		},
		settlement: resolveSettlementKind(existingInvoice.invoice_type),
	};
}

/**
 * Builds the `TransactionInvoice` snapshot used by payment settlements and
 * `onInvoicePaid` hooks.
 */
export function buildPaidInvoiceSnapshot(
	existingInvoice: TransactionInvoice,
	outcome: WebhookNotificationOutcome,
	now: Date = new Date()
): TransactionInvoice {
	return {
		...existingInvoice,
		status: "paid",
		paid_date: outcome.paidDate ?? now.toISOString(),
	};
}

export function buildUnresolvableInvoiceEvent(payload: WebhookPayload): {
	event_name: string;
	event_json: WebhookPayload;
} {
	return {
		event_name: "midtrans.webhook.unresolvable_invoice",
		event_json: payload,
	};
}

export function buildInvoiceNotFoundEvent(
	invoiceId: string,
	payload: WebhookPayload
): { event_name: string; event_json: WebhookPayload } {
	return {
		event_name: "midtrans.webhook.invoice_not_found",
		event_json: { invoice_id: invoiceId, ...payload },
	};
}

export function buildDuplicateWebhookEvent(
	existingInvoice: TransactionInvoice
): { event_name: string; event_json: Record<string, unknown> } {
	return {
		event_name: "midtrans.webhook.duplicate_ignored",
		event_json: {
			invoice_id: existingInvoice.invoice_id,
			status: "already_paid",
			order_id: existingInvoice.order_id,
		},
	};
}
