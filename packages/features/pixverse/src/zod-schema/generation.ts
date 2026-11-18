import { z } from "zod/v4";
import { PixverseGenerationBaseSchema } from "./shared";

/**
 * A text-to-video creation request.
 */
export const TextToVideoRequestSchema = PixverseGenerationBaseSchema.meta({
	id: "PixverseTextToVideoRequest",
	description: "A text-to-video creation request.",
});

/**
 * An image-to-video creation request.
 *
 * The endpoint serves two shapes of task, and the request has to pick one:
 * an ordinary image generation names a single uploaded image with `img_id`,
 * while a template task names the template with `template_id` and the
 * image fields that template declares. The refinement below is what keeps a
 * request from being both — or neither.
 */
export const ImageToVideoRequestSchema = PixverseGenerationBaseSchema.extend({
	img_id: z
		.int()
		.optional()
		.describe("Image returned by POST /openapi/v2/image/upload."),
	img_ids: z
		.array(z.int())
		.optional()
		.describe("Ordered images a template task consumes."),
	template_id: z
		.int()
		.optional()
		.describe("Template the task is created from."),
})
	.refine(
		(value) =>
			value.template_id === undefined ? value.img_id !== undefined : true,
		{
			message:
				"An image-to-video task needs `img_id` unless it names a `template_id`.",
			path: ["img_id"],
		}
	)
	.meta({
		id: "PixverseImageToVideoRequest",
		description: "An image-to-video creation request.",
	});

export type TextToVideoRequest = z.infer<typeof TextToVideoRequestSchema>;
export type ImageToVideoRequest = z.infer<typeof ImageToVideoRequestSchema>;
