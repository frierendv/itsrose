import { z } from "zod/v4";
import {
	SnapPreferenceBrand,
	SnapPreferenceCustomerFeeSchema,
	SnapPreferencePaymentChannelSchema,
} from "./shared";

/**
 * Snap payment token and hosted redirect URL.
 */
export const SnapTransactionResponseSchema = z
	.object({
		/**
		 * Snap payment token.
		 *
		 * Can be used to pass into Snap.js
		 */
		token: z.string(),
		/**
		 * Hosted payment checkout page URL to redirect customer to.
		 */
		redirect_url: z.url(),
	})
	.meta({
		id: "MidtransSnapTransactionResponse",
	});

export type SnapTransactionResponse = z.infer<
	typeof SnapTransactionResponseSchema
>;

/**
 * Response for the Snap merchant preference query.
 */
export const SnapPreferenceResponseSchema = z
	.object({
		merchant_id: z.string(),
		display_name: z.string(),
		finish_payment_return_url: z.url().nullish(),
		error_payment_return_url: z.url().nullish(),
		locale: z.string(),
		other_va_processor: z.string(),
		allow_retry: z.boolean().nullish(),
		hide_order_id: z.boolean(),
		brand: SnapPreferenceBrand,
		payment_channels: z.array(SnapPreferencePaymentChannelSchema),
		customer_imposed_payment_fee: SnapPreferenceCustomerFeeSchema,
		feature_types: z.array(z.string()),
	})
	.meta({ id: "MidtransSnapPreferenceResponse" });

export type SnapPreferenceResponse = z.infer<
	typeof SnapPreferenceResponseSchema
>;
