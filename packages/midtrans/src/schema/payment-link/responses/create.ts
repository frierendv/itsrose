import { z } from "zod/v4";

/**
 * Response returned from creating a payment link.
 *
 * `POST /v1/payment-links`
 */
export const PaymentLinkResponse = z
	.object({
		order_id: z.string(),
		payment_link_url: z.string().url(),
		payment_link_id: z.string(),
	})
	.meta({
		id: "MidtransPaymentLinkResponse",
	});

export type PaymentLinkResponse = z.infer<typeof PaymentLinkResponse>;
