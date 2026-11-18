import { z } from "zod/v4";
import {
	PixverseSyncState,
	PixverseTaskFailure,
} from "../constants/task-status";

/**
 * Why a failed task failed.
 */
export const PixverseTaskErrorSchema = z
	.object({
		type: z
			.enum([
				PixverseTaskFailure.MODERATION,
				PixverseTaskFailure.GENERATION,
			])
			.describe("What failed the task."),
		message: z
			.string()
			.describe("Human-readable description of the failure."),
	})
	.meta({ id: "PixverseTaskError" });

/**
 * A task, as this package publishes it.
 *
 * The upstream reports a numeric status and a couple of camelCase fields;
 * this payload carries the shared `status` vocabulary and snake_case
 * throughout, so a route can answer with it unchanged.
 */
export const PixverseTaskResponseSchema = z
	.object({
		status: z
			.enum([
				PixverseSyncState.NOT_STARTED,
				PixverseSyncState.IN_PROGRESS,
				PixverseSyncState.COMPLETED,
				PixverseSyncState.FAILED,
			])
			.describe("Task status."),
		task_id: z.string().describe("Task Identifier."),
		media_list: z
			.array(z.string())
			.describe("Output media; empty until the task completes."),
		prompt: z.string().describe("Prompt the task was created with."),
		negative_prompt: z
			.string()
			.describe("Negative prompt the task was created with."),
		quality: z.string().optional().describe("Resolution of the output."),
		duration: z.number().optional().describe("Duration, in seconds."),
		aspect_ratio: z
			.string()
			.optional()
			.describe("Aspect ratio of the output."),
		seed: z.number().optional().describe("Seed the render used."),
		has_audio: z.boolean().describe("Whether the output carries audio."),
		credits: z.number().optional().describe("Credits the task consumed."),
		created_at: z.string().describe("Creation time, ISO 8601."),
		modified_at: z.string().describe("Last update time, ISO 8601."),
		error: PixverseTaskErrorSchema.optional().describe(
			"Why the task failed; present only when it failed."
		),
	})
	.meta({
		id: "PixverseTaskResponse",
		description: "The response schema for PixVerse tasks.",
	});

/**
 * The task a creation endpoint accepted, as this package publishes it.
 */
export const PixverseTaskCreatedResponseSchema = z
	.object({
		status: z
			.enum([PixverseSyncState.IN_PROGRESS])
			.describe("Task status; a freshly created task is in progress."),
		task_id: z.string().describe("Task Identifier."),
		credits: z
			.number()
			.describe("Credits the task is expected to consume."),
	})
	.meta({
		id: "PixverseTaskCreatedResponse",
		description: "The response schema for an accepted PixVerse task.",
	});

export type PixverseTaskError = z.infer<typeof PixverseTaskErrorSchema>;
export type PixverseTaskResponse = z.infer<typeof PixverseTaskResponseSchema>;
export type PixverseTaskCreatedResponse = z.infer<
	typeof PixverseTaskCreatedResponseSchema
>;
