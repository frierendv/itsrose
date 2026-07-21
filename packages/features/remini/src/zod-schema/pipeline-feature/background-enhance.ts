import { z } from "zod/v4";

export const BackgroundEnhanceFeatureSchema = z.object({
	model: z
		.enum(["shiba-strong-tensorrt", "rhino-tensorrt", "upsampler-bicubic"])
		.describe(
			"Identifier of the model used for background enhancement or upsampling."
		),
	remove_color_shift: z
		.boolean()
		.describe(
			"When true, removes color shifts as part of background enhancement."
		),
});
