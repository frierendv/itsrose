import { z } from "zod/v4";

export const AutoBalanceFeatureSchema = z.object({
	auto_contrast: z.object({
		contrast_intensity_coefficient: z
			.number()
			.min(0)
			.max(10)
			.describe(
				"Coefficient controlling contrast intensity for automatic contrast adjustment."
			),
	}),
});
