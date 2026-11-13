import {
	classifyTransactionStatus,
	InvoiceWebhookSchema,
	type MidtransClient,
} from "@itsrose/midtrans";
import {
	InvoiceStatusSchema,
	type InvoiceStatus,
} from "../domain/invoice-status";
import type { GatewayInvoice } from "../domain/invoice.service";
import type {
	InvoiceCreatePayload,
	PaymentGatewayPort,
	PaymentGatewayResult,
	PaymentGatewayVoidResult,
	WebhookNotificationContext,
} from "../domain/ports";

/**
 * Translates a Midtrans transaction status into the domain invoice vocabulary.
 *
 * This is the ONLY place in the billing package that knows what a Midtrans
 * status means. The domain only ever sees an {@link InvoiceStatus}.
 *
 * The mapping is driven by the gateway's own outcome classifier, so the
 * `fraud_status` refinement of `capture` / `authorize` / `pending` is honoured:
 *
 * | Midtrans outcome | Domain invoice status |
 * | ----------------- | --------------------- |
 * | `paid`            | `paid`                |
 * | `pending`         | `pending`             |
 * | `challenged`      | `pending`             |
 * | `failed`          | `rejected`            |
 * | `refunded`        | `paid`                |
 * | `unknown`         | `pending`             |
 *
 * The `failed` outcome is refined by the raw status, because the domain
 * vocabulary distinguishes a cancelled charge (`canceled`) and an expired
 * charge (`expired`) from a hard rejection (`rejected`).
 *
 * `refunded` maps to `paid` because a refund can only follow a captured
 * payment: the invoice *was* paid, and the refund is a transaction-level fact
 * rather than an invoice-level state. The domain invoice vocabulary has no
 * `refunded` state, and reporting `canceled` would erase the payment record
 * of an invoice that was genuinely settled.
 *
 * `unknown` maps to `pending`: an unrecognised provider status must never be
 * allowed to look like a voidable, unpaid, or settled invoice.
 */
export function mapTransactionStatusToInvoiceStatus(
	transactionStatus: string | undefined,
	fraudStatus?: string | undefined
): InvoiceStatus {
	if (!transactionStatus) {
		return "pending";
	}

	const { outcome } = classifyTransactionStatus(
		transactionStatus,
		fraudStatus
	);

	switch (outcome) {
		case "paid":
			return "paid";
		case "failed":
			// The domain vocabulary distinguishes the ways a charge can end
			// without payment.
			if (transactionStatus === "cancel") {
				return "canceled";
			}

			if (transactionStatus === "expire") {
				return "expired";
			}

			return "rejected";
		case "refunded":
			return "paid";
		case "pending":
		case "challenged":
		case "unknown":
		default:
			return "pending";
	}
}

/**
 * Narrows a remote invoice status into the domain vocabulary.
 *
 * The provider's invoice vocabulary happens to coincide with the domain one;
 * this still validates rather than casts, so an unexpected provider value
 * becomes `null` instead of leaking into the invoice column.
 */
export function mapInvoiceStatusToDomainStatus(
	status: string | null | undefined
): InvoiceStatus | null {
	const parsed = InvoiceStatusSchema.safeParse(status);

	return parsed.success ? parsed.data : null;
}

/**
 * Concrete payment gateway adapter for the Midtrans SDK.
 *
 * All provider-specific typing, schema parsing, status translation and
 * signature verification live here so the application/domain layers never
 * import the provider SDK.
 */
export function createMidtransPaymentGateway(
	client: MidtransClient
): PaymentGatewayPort {
	return {
		generateOrderId(userId) {
			return client.merchant.generateOrderId(userId);
		},

		parseNotification(
			payload: Record<string, unknown>
		): WebhookNotificationContext {
			const parsed = InvoiceWebhookSchema.safeParse(payload);

			const transactionStatus =
				typeof payload.transaction_status === "string"
					? payload.transaction_status
					: undefined;
			const fraudStatus =
				typeof payload.fraud_status === "string"
					? payload.fraud_status
					: undefined;

			return {
				invoiceId: parsed.success
					? parsed.data.metadata?.midtrans_invoice_id
					: undefined,
				orderId:
					typeof payload.order_id === "string"
						? payload.order_id
						: undefined,
				status: mapTransactionStatusToInvoiceStatus(
					transactionStatus,
					fraudStatus
				),
			};
		},

		async createInvoice(
			payload: InvoiceCreatePayload,
			options
		): Promise<PaymentGatewayResult<GatewayInvoice>> {
			const { data, error } = await client.invoice.create(payload, {
				idempotencyKey: options.idempotencyKey,
			});

			if (error || !data) {
				return {
					ok: false,
					message:
						error?.error_messages?.join("; ") ||
						"Failed to create Midtrans invoice.",
				};
			}

			return {
				ok: true,
				data: {
					...data,
					status: mapInvoiceStatusToDomainStatus(data.status) ?? null,
				},
			};
		},

		async getInvoice(invoiceId) {
			try {
				const { data } = await client.invoice.get(invoiceId);

				if (!data) {
					return null;
				}

				return {
					...data,
					status: mapInvoiceStatusToDomainStatus(data.status) ?? null,
				};
			} catch {
				// A transient read failure must not abort the webhook: the
				// notification already carries the normalised status, so the
				// domain can settle without a remote read.
				return null;
			}
		},

		async voidInvoice(invoiceId): Promise<PaymentGatewayVoidResult> {
			const { error } = await client.invoice.void(invoiceId);

			if (error) {
				return {
					ok: false,
					message:
						error.error_messages?.join("; ") ||
						"Failed to void Midtrans invoice.",
				};
			}

			return { ok: true };
		},

		verifySignature(payload) {
			return client.merchant.verifySignature(payload);
		},
	};
}
