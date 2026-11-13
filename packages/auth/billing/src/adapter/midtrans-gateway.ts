import { InvoiceWebhookSchema, type MidtransClient } from "@itsrose/midtrans";
import type { GatewayInvoice } from "../domain/invoice.service";
import type {
	InvoiceCreatePayload,
	PaymentGatewayPort,
	PaymentGatewayResult,
	PaymentGatewayVoidResult,
	WebhookNotificationContext,
} from "../domain/ports";

/**
 * Concrete payment gateway adapter for the Midtrans SDK.
 *
 * All provider-specific typing, schema parsing and signature verification live
 * here so the application/domain layers never import the provider SDK.
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

			return {
				invoiceId: parsed.success
					? parsed.data.metadata?.midtrans_invoice_id
					: undefined,
				orderId:
					typeof payload.order_id === "string"
						? payload.order_id
						: undefined,
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
				data: data as GatewayInvoice,
			};
		},

		async getInvoice(invoiceId) {
			const { data } = await client.invoice.get(invoiceId);
			return (data ?? null) as GatewayInvoice | null;
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
