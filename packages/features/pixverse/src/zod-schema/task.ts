import { z } from "zod/v4";

/**
 * What a creation endpoint answers with when it accepted a task.
 *
 * Every creation endpoint of the video surface answers this payload, and
 * `video_id` is the handle the result endpoint is polled with.
 */
export const PixverseTaskCreatedSchema = z
	.object({
		video_id: z
			.int()
			.describe(
				"Task identifier, polled at GET /openapi/v2/video/result/{video_id}."
			),
		credits: z.int().describe("Credits the task is expected to consume."),
	})
	.catchall(z.unknown())
	.meta({
		id: "PixverseTaskCreated",
		description: "The task a creation endpoint accepted.",
	});

/**
 * The fields PixVerse adds to a task it renders with the API generation
 * pipeline.
 *
 * The block is descriptive rather than authoritative: every field may be
 * absent, and unknown fields are kept.
 */
export const PixverseCustomerPathsSchema = z
	.object({
		ext_info: z.unknown().nullish(),
		agent_info: z.unknown().nullish(),
		cameo_id_list: z.unknown().nullish(),
		duration_type: z.string().optional(),
		thinking_type: z.string().optional(),
		caption_switch: z.boolean().optional(),
		fusion_id_list: z.unknown().nullish(),
		model_evaluator: z.string().optional(),
		use_api_gen_image: z.boolean().optional(),
	})
	.catchall(z.unknown())
	.meta({ id: "PixverseCustomerPaths" });

/**
 * The result of a video generation task.
 *
 * `status` carries the lifecycle documented by PixVerse: `1` completed,
 * `5` generating, `7` moderation failed, `8` failed. The URL of the output
 * is only meaningful once the task completed.
 *
 * The output dimensions are the two fields PixVerse documents in
 * `outputWidth` / `outputHeight` - the rest of this payload is snake_case,
 * but these two are not, and renaming them would describe a field the
 * upstream does not send.
 */
export const PixverseTaskResultSchema = z
	.object({
		id: z.int().describe("Task identifier."),
		prompt: z.string().describe("Prompt the task was created with."),
		negative_prompt: z
			.string()
			.optional()
			.describe("Negative prompt the task was created with."),
		resolution_ratio: z.int().optional(),
		url: z
			.string()
			.describe("URL of the generated video, once the task completed."),
		path: z.string().optional().describe("Storage path of the output."),
		size: z.number().optional().describe("Size of the output, in MB."),
		seed: z.int().optional().describe("Seed the render used."),
		status: z.int().describe("1 completed, 5 generating, 7 or 8 failed."),
		style: z.string().optional(),
		create_time: z.string().describe("Creation time, ISO 8601."),
		modify_time: z.string().describe("Last update time, ISO 8601."),
		// eslint-disable-next-line zod/consistent-object-property-key-style -- the upstream field name
		outputWidth: z.int().optional().describe("Width of the output."),
		// eslint-disable-next-line zod/consistent-object-property-key-style -- the upstream field name
		outputHeight: z.int().optional().describe("Height of the output."),
		quality: z.string().optional().describe("Resolution of the output."),
		duration: z.int().optional().describe("Duration, in seconds."),
		aspect_ratio: z.string().optional(),
		has_audio: z.boolean().optional(),
		credits: z.int().optional().describe("Credits the task consumed."),
		customer_paths: PixverseCustomerPathsSchema.optional(),
	})
	.catchall(z.unknown())
	.meta({
		id: "PixverseTaskResult",
		description: "The result of a video generation task.",
	});

export type PixverseTaskCreated = z.infer<typeof PixverseTaskCreatedSchema>;
export type PixverseTaskResult = z.infer<typeof PixverseTaskResultSchema>;
export type PixverseCustomerPaths = z.infer<typeof PixverseCustomerPathsSchema>;
