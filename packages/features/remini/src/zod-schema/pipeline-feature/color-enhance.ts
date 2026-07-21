import { z } from "zod/v4";

export const ColorEnhanceFeatureSchema = z.object({
	model: z
		.enum([
			"prism-blend",
			"orange-teal",
			"orange-teal_v2",
			"silky",
			"muted",
			"lit_soft_warm",
			"prism-expert-a",
			"prism-expert-c",
		])
		.describe("Identifier of the color enhancement model to apply."),
});
