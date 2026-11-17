import { z } from "zod/v4";
import {
	CallbacksSchema,
	CustomFieldsSchema,
	ItemDetailsSchema,
	PaymentChannelsSchema,
} from "../primitives";
import {
	PaymentLinkBankSchema,
	PaymentLinkCustomerDetailSchema,
	PaymentLinkExpirySchema,
	PaymentLinkTransactionDetail,
} from "./shared";

/**
 * Payload for creating a payment link via Payment Link API.
 *
 * `POST /v1/payment-links`
 */
export const PaymentLinkRequestSchema = z
	.object({
		transaction_details: PaymentLinkTransactionDetail,
		customer_required: z
			.boolean()
			.optional()
			.describe("Whether customer details are mandatory before payment"),
		customer_details: PaymentLinkCustomerDetailSchema.optional(),
		item_details: z.array(ItemDetailsSchema).optional(),
		/**
		 * Max number of times this link can be paid.
		 * `null` or omitted for single/unlimited based on config.
		 */
		usage_limit: z.int().nullish(),
		expiry: PaymentLinkExpirySchema.optional(),
		/**
		 * List of allowed payment methods for this link.
		 */
		enabled_payments: z
			.array(PaymentChannelsSchema)
			.optional()
			.describe("List of allowed payment methods for this link"),
		callbacks: CallbacksSchema.optional(),
		custom_field1: z.string().max(255).optional(),
		custom_field2: z.string().max(255).optional(),
		custom_field3: z.string().max(255).optional(),
	})
	.extend(CustomFieldsSchema.shape)
	.and(PaymentLinkBankSchema)
	.meta({
		id: "MidtransPaymentLinkRequest",
	});

export type PaymentLinkRequest = z.infer<typeof PaymentLinkRequestSchema>;
