import { z } from "zod/v4";

export const DodgeBurnFeatureSchema = z.object({
	model: z
		.literal("dodge_burn_residuals_big")
		.describe("Identifier for the dodge-and-burn residuals model."),
	intensity: z
		.number()
		.min(0)
		.max(1)
		.describe(
			"Intensity of the dodge-and-burn effect, normalized from 0.0 to 1.0."
		),
});
