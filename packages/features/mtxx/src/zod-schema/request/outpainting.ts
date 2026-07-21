import { z } from "zod/v4";
import { SharedRequestSchema } from "../shared";

const RatioFloatSchema = z.number().min(0.0).max(1.0).multipleOf(0.1);

const OptionalOutpaintingSchema = z.object({
	seed: z
		.number()
		.int()
		.min(-1)
		.max(65535)
		.optional()
		.describe(
			"Controls the randomness of the generation. " +
				"Use a fixed value to reproduce the same result across requests. " +
				"Set to `-1` to use a random seed on each request."
		),

	extra_prompt: z
		.string()
		.optional()
		.describe(
			"Supplementary text prompt to guide the outpainting generation. " +
				"Only English is supported. " +
				"Separate multiple prompt keywords with a comma (`,`)."
		),

	high_quality_encode: z
		.boolean()
		.optional()
		.describe(
			"When `true`, the output image is encoded with high-quality, low-compression settings, " +
				"producing larger file sizes but preserving finer details and reducing artifacts."
		),
});

const BaseOutpaintingSchema = OptionalOutpaintingSchema.extend(
	SharedRequestSchema.shape
).meta({
	id: "MTXxOutpaintingBaseRequest",
});

const UniformExpandRatioSchema = z
	.object({
		expand_ratio: RatioFloatSchema.describe(
			"Accepts a value between `0.0` and `1.0` in increments of `0.1`.\n\n" +
				"The final canvas size is calculated as: `original_size × (1 + ratio × 2)`.\n\n" +
				"| Value | Width & Height Scale |\n" +
				"|-------|----------------------|\n" +
				"| `0.1` | 120% of original     |\n" +
				"| `0.3` | 160% of original     |\n" +
				"| `0.5` | 200% of original     |\n" +
				"| `1.0` | 300% of original     |"
		),
	})
	.and(BaseOutpaintingSchema)
	.meta({
		title: "Uniform Expand Ratio",
		description:
			"Expands the image canvas uniformly on all sides using a single ratio value.",
	});

const FreeExpandRatioSchema = z
	.object({
		free_expand_ratio: z
			.object({
				left: RatioFloatSchema.describe(
					"Expansion ratio for the left side. Range: `0.0` – `1.0`."
				),
				right: RatioFloatSchema.describe(
					"Expansion ratio for the right side. Range: `0.0` – `1.0`."
				),
				top: RatioFloatSchema.describe(
					"Expansion ratio for the top side. Range: `0.0` – `1.0`."
				),
				bottom: RatioFloatSchema.describe(
					"Expansion ratio for the bottom side. Range: `0.0` – `1.0`."
				),
			})
			.meta({
				title: "Per-Side Expansion Ratios",
				description:
					"Defines independent expansion ratios for each side of the image. \n" +
					"- `left` and `right` are proportional to the original width. \n" +
					"- `top` and `bottom` are proportional to the original height.",
			}),
	})
	.and(BaseOutpaintingSchema)
	.meta({
		title: "Free Expand Ratio",
		description:
			"Expands the image canvas independently on each side using per-side ratio values. " +
			"Use this when the subject is off-center or asymmetric padding is required.",
	});

const FreeExpandPixelSchema = z
	.object({
		free_expand_pixel: z
			.object({
				left: z
					.number()
					.int()
					.min(0)
					.max(2048)
					.describe(
						"Pixels to add to the left side. Range: `0` – `2048`."
					),
				right: z
					.number()
					.int()
					.min(0)
					.max(2048)
					.describe(
						"Pixels to add to the right side. Range: `0` – `2048`."
					),
				top: z
					.number()
					.int()
					.min(0)
					.max(2048)
					.describe(
						"Pixels to add to the top side. Range: `0` – `2048`."
					),
				bottom: z
					.number()
					.int()
					.min(0)
					.max(2048)
					.describe(
						"Pixels to add to the bottom side. Range: `0` – `2048`."
					),
			})
			.meta({
				title: "Per-Side Expansion Pixels",
				description:
					"Defines the exact number of pixels to add to each side of the image canvas. " +
					"Provides pixel-level precision for layouts where exact output dimensions are required.",
			}),
	})
	.and(BaseOutpaintingSchema)
	.meta({
		title: "Free Expand Pixel",
		description:
			"Expands the image canvas by an absolute pixel count on each side. " +
			"Use this when you need precise control over the output image dimensions.",
	});

export const OutpaintingRequestSchema = z
	.union([
		UniformExpandRatioSchema,
		FreeExpandRatioSchema,
		FreeExpandPixelSchema,
	])
	.meta({
		title: "Outpainting Request",
	});

export type OutpaintingRequest = z.infer<typeof OutpaintingRequestSchema>;
