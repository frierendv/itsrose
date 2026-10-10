import { z } from "zod/v4";
import {
	PaymentLinkBank,
	PaymentLinkCallback,
	PaymentLinkCustomerDetail,
	PaymentLinkCustomFields,
	PaymentLinkExpiry,
	PaymentLinkItemDetail,
	PaymentLinkTransactionDetail,
} from "../shared";

/**
 * Payload for creating a payment link via Payment Link API.
 *
 * `POST /v1/payment-links`
 */
export const PaymentLinkRequest = z
	.object({
		transaction_details: PaymentLinkTransactionDetail,
		customer_required: z
			.boolean()
			.optional()
			.describe("Whether customer details are mandatory before payment"),
		customer_details: PaymentLinkCustomerDetail.optional(),
		item_details: z.array(PaymentLinkItemDetail).optional(),
		/**
		 * Max number of times this link can be paid.
		 * `null` or omitted for single/unlimited based on config.
		 */
		usage_limit: z.number().int().positive().nullable().optional(),
		expiry: PaymentLinkExpiry.optional(),
		/**
		 * List of allowed payment methods for this link.
		 */
		enabled_payments: z
			.array(z.string())
			.optional()
			.describe("List of allowed payment methods for this link"),
		callbacks: PaymentLinkCallback.optional(),
		custom_field1: z.string().max(255).optional(),
		custom_field2: z.string().max(255).optional(),
		custom_field3: z.string().max(255).optional(),
	})
	.extend(PaymentLinkCustomFields.shape)
	.and(PaymentLinkBank)
	.meta({
		id: "MidtransPaymentLinkRequest",
	});

export type PaymentLinkRequest = z.infer<typeof PaymentLinkRequest>;
