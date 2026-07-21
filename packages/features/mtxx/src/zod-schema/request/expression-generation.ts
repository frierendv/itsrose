import { z } from "zod/v4";
import { SharedRequestSchema } from "../shared";

export const ExpressionGenerationRequestSchema = z
	.object({
		smile_mode: z
			.number()
			.int()
			.min(0)
			.max(5)
			.describe(
				`Smile mode:

- 0: Laughing
- 1: Smile
- 2: Pursed lips smile
- 3: Cool
- 4: Classic smile with dimples
- 5: Dimples secondary effect`.trim()
			),
		mtxx_mz_kl_flag: z
			.number()
			.int()
			.min(0)
			.max(1)
			.optional()
			.describe("Lips cooler interface flag (0: Default, 1: Enabled)"),
		wb_flag: z
			.number()
			.int()
			.min(0)
			.max(1)
			.optional()
			.describe(
				"White balance post-processing flag (0: Disabled, 1: Enabled)"
			),
	})
	.and(SharedRequestSchema)
	.meta({
		title: "Expression Generation Request Schema",
	});

export interface IExpressionGenerationRequest extends z.infer<
	typeof ExpressionGenerationRequestSchema
> {}
