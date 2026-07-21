import { z } from "zod/v4";

export const FaceEnhanceFeatureSchema = z.object({
	model: z
		.enum(["remini", "recommender_entire_dataset"])
		.describe("Identifier of the face enhancement model to apply."),
	pre_blur: z
		.number()
		.min(0)
		.max(1)
		.describe(
			"Amount of pre-blur applied prior to face enhancement, normalized between 0 and 1."
		),
});
