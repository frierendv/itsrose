import { z } from "zod/v4";
import { SnapBrand, SnapPreference } from "../requests/preference";

export const SnapFeeConfig = z.object({
	enable: z.boolean(),
	payment_type: z.string(),
	customer_percentage: z.number(),
	acquirer: z.string().optional(),
});
/**
 * Response for Snap merchant preference query.
 */
export const SnapPreferenceResponse = SnapPreference.omit({
	error_payment_return_url: true,
	finish_payment_return_url: true,
	brand: true,
})
	.required()
	.extend({
		error_payment_return_url: z.string().nullish(),
		finish_payment_return_url: z.string().nullish(),
		brand: SnapBrand,

		merchant_id: z.string(),
		customer_imposed_payment_fee: z.object({
			enable: z.boolean(),
			payment_fee_configs: z.union([
				SnapFeeConfig.omit({ acquirer: true }),
				SnapFeeConfig.required(),
			]),
		}),
		feature_types: z.array(z.any()).nullish().optional(),
	})
	.meta({ id: "MidtransSnapPreferenceResponse" });

export type SnapPreferenceResponse = z.infer<typeof SnapPreferenceResponse>;
