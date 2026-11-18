import { z } from "zod/v4";

/**
 * The models the public text-to-video endpoint accepts.
 */
export const PixverseModelSchema = z
	.enum([
		"v6-max",
		"c1",
		"v6",
		"v3.5",
		"v4",
		"v4.5",
		"v5",
		"v5-fast",
		"v5.5",
		"v5.6",
	])
	.describe("Model used to render the video.");

/**
 * The output resolutions the video endpoints accept.
 */
export const PixverseQualitySchema = z
	.enum(["360p", "540p", "720p", "1080p"])
	.describe("Output resolution.");

/**
 * The aspect ratios the video endpoints accept.
 */
export const PixverseAspectRatioSchema = z
	.enum(["16:9", "9:16", "4:3", "3:4", "1:1", "2:3", "3:2", "21:9"])
	.describe("Aspect ratio of the output.");

/**
 * The duration of a generated video, in seconds.
 */
export const PixverseDurationSchema = z
	.int()
	.min(1)
	.max(15)
	.describe("Video duration in seconds, from 1 to 15.");

/**
 * The identifier of a registered webhook callback.
 */
export const PixverseWebhookIdSchema = z
	.string()
	.describe("Identifier of a webhook registered in the PixVerse console.");

/**
 * The fields every generation request shares.
 */
export const PixverseGenerationBaseSchema = z.object({
	model: PixverseModelSchema,
	prompt: z
		.string()
		.min(1)
		.max(5000)
		.describe("Description of the scene to generate."),
	duration: PixverseDurationSchema,
	quality: PixverseQualitySchema,
	aspect_ratio: PixverseAspectRatioSchema,
	seed: z
		.int()
		.min(0)
		.max(2147483647)
		.optional()
		.describe("Seed used to make a generation reproducible."),
	webhook_id: PixverseWebhookIdSchema.optional(),
	generate_audio_switch: z
		.boolean()
		.optional()
		.describe("Generate an audio track alongside the video."),
	generate_multi_clip_switch: z
		.boolean()
		.optional()
		.describe("Generate a multi-clip video."),
});

export type PixverseModel = z.infer<typeof PixverseModelSchema>;
export type PixverseQuality = z.infer<typeof PixverseQualitySchema>;
export type PixverseAspectRatio = z.infer<typeof PixverseAspectRatioSchema>;
export type PixverseGenerationBase = z.infer<
	typeof PixverseGenerationBaseSchema
>;
