import { z } from "zod/v4";
import {
	SnapPreferenceBrand,
	SnapPreferenceFeeConfig,
	SnapPreferenceSchema,
} from "./shared";

export const SnapTransactionResponseSchema = z.object({
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
});

export type SnapTransactionResponse = z.infer<
	typeof SnapTransactionResponseSchema
>;

/**
 * Response for Snap merchant preference query.
 */
export const SnapPreferenceResponseSchema = SnapPreferenceSchema.omit({
	error_payment_return_url: true,
	finish_payment_return_url: true,
	brand: true,
})
	.required()
	.extend({
		error_payment_return_url: z.string().nullish(),
		finish_payment_return_url: z.string().nullish(),
		brand: SnapPreferenceBrand,

		merchant_id: z.string(),
		customer_imposed_payment_fee: z.object({
			enable: z.boolean(),
			payment_fee_configs: z.union([
				SnapPreferenceFeeConfig.omit({ acquirer: true }),
				SnapPreferenceFeeConfig.required(),
			]),
		}),
		feature_types: z.array(z.any()).nullish().optional(),
	})
	.meta({ id: "MidtransSnapPreferenceResponse" });

export type SnapPreferenceResponse = z.infer<
	typeof SnapPreferenceResponseSchema
>;
