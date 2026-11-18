import { parseUpstreamPayload } from "@itsrose/upstream-client";
import {
	PIXVERSE_TASK_STATUS,
	PixverseSyncState,
	PixverseTaskFailure,
	toSyncState,
} from "../constants/task-status";
import type {
	PixverseTaskCreated,
	PixverseTaskCreatedResponse,
	PixverseTaskError,
	PixverseTaskResponse,
	PixverseTaskResult,
} from "../zod-schema";
import {
	PixverseTaskCreatedResponseSchema,
	PixverseTaskResponseSchema,
} from "../zod-schema";

/**
 * Describes why an upstream task that failed failed.
 *
 * @param task The task the upstream answered with.
 * @returns The failure to publish, or `undefined` when the task did not fail.
 */
export function describeFailure(
	task: PixverseTaskResult
): PixverseTaskError | undefined {
	if (task.status === PIXVERSE_TASK_STATUS.moderation_failed) {
		return {
			type: PixverseTaskFailure.MODERATION,
			message:
				"The task failed content moderation. Review the input content before retrying.",
		};
	}

	if (task.status === PIXVERSE_TASK_STATUS.failed) {
		return {
			type: PixverseTaskFailure.GENERATION,
			message: "The video generation failed.",
		};
	}

	return undefined;
}

/**
 * Translates the task an upstream query answered with.
 *
 * The output is only published once the task completed: a URL that is
 * present while the task is still generating is not a result yet.
 *
 * @param task The task the upstream answered with.
 * @returns The task as this package publishes it.
 * @throws {UpstreamApiError} When the translated payload does not match the
 * published schema.
 */
export function toTaskResponse(task: PixverseTaskResult): PixverseTaskResponse {
	const status = toSyncState(task.status);
	const error = describeFailure(task);

	return parseUpstreamPayload(
		PixverseTaskResponseSchema,
		{
			status,
			task_id: String(task.id),
			media_list:
				status === PixverseSyncState.COMPLETED && task.url
					? [task.url]
					: [],
			prompt: task.prompt,
			negative_prompt: task.negative_prompt ?? "",
			quality: task.quality,
			duration: task.duration,
			aspect_ratio: task.aspect_ratio,
			seed: task.seed,
			has_audio: task.has_audio ?? false,
			credits: task.credits,
			created_at: task.create_time,
			modified_at: task.modify_time,
			// only present when the task failed: an explicit `undefined`
			// would publish the key with no value
			...(error ? { error } : {}),
		},
		{ service: "pixverse", label: "task" }
	);
}

/**
 * Translates the task a creation endpoint accepted.
 *
 * The call only reports that PixVerse accepted the task, so the published
 * status is `in_progress` and there is no media yet.
 *
 * @param task The task the upstream accepted.
 * @returns The accepted task as this package publishes it.
 * @throws {UpstreamApiError} When the translated payload does not match the
 * published schema.
 */
export function toTaskCreatedResponse(
	task: PixverseTaskCreated
): PixverseTaskCreatedResponse {
	return parseUpstreamPayload(
		PixverseTaskCreatedResponseSchema,
		{
			status: PixverseSyncState.IN_PROGRESS,
			task_id: String(task.video_id),
			credits: task.credits,
		},
		{ service: "pixverse", label: "task" }
	);
}
