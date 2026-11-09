import { z } from "zod/v4";
import { PaymentFieldsSchema, type PaymentFields } from "./payment";

export const CorePaymentChargeRequestSchema = PaymentFieldsSchema;
export type CorePaymentChargeRequest = PaymentFields;

export const CorePaymentRefundRequestSchema = z.object({
	/**
	 * Merchant idempotency key to prevent double refunds.
	 */
	refund_key: z.string().min(1).max(50).optional(),
	/**
	 * Refund amount in IDR. Omit for full refund.
	 */
	amount: z.number().int().positive().optional(),
	/**
	 * Reason for issuing the refund
	 */
	reason: z.string().max(255),
});
export type CorePaymentRefundRequest = z.infer<
	typeof CorePaymentRefundRequestSchema
>;

/**
 * Payload for capturing an authorized card transaction.
 *
 * `POST /v2/capture`
 */
export const CoreCaptureRequestSchema = z.object({
	/** Midtrans transaction identifier returned by the charge request. */
	transaction_id: z.string(),
});

export type CoreCaptureRequest = z.infer<typeof CoreCaptureRequestSchema>;

/**
 * Body of `/v2/{order_id}/refund/online/direct`.
 *
 * The direct-refund endpoint accepts the same fields as a regular refund.
 */
export const CoreDirectRefundRequestSchema = CorePaymentRefundRequestSchema;

export type CoreDirectRefundRequest = CorePaymentRefundRequest;
