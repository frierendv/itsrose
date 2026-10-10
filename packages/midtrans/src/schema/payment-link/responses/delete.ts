import { z } from "zod/v4";

/**
 * Response returned from deleting a payment link.
 *
 * `DELETE /v1/payment-links/{orderId}`
 */
export const PaymentLinkDeleteResponse = z
	.object({
		message: z.string().optional(),
		status_code: z.string().optional(),
	})
	.meta({
		id: "MidtransPaymentLinkDeleteResponse",
	});

export type PaymentLinkDeleteResponse = z.infer<
	typeof PaymentLinkDeleteResponse
>;
