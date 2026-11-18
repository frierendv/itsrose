import { neverRetry } from "@itsrose/upstream-client";
import { requestPixverse } from "../client/send";
import { toTaskCreatedResponse } from "../utils/translate-task";
import type {
	PixverseTaskCreated,
	PixverseTaskCreatedResponse,
	TextToVideoRequest,
} from "../zod-schema";
import {
	PixverseTaskCreatedResponseSchema,
	PixverseTaskCreatedSchema,
	TextToVideoRequestSchema,
} from "../zod-schema";

/**
 * Creates a video from a text prompt.
 *
 * The call is accepted when PixVerse answers `ErrCode=0` with a task id; it
 * does not mean the video was rendered. Poll {@linkcode getTask} with the
 * returned `task_id`, or pass a `webhook_id` and wait for the callback.
 *
 * @param input The generation request.
 * @returns The accepted task, in the status vocabulary this package
 * publishes.
 * @throws {UpstreamApiError} When PixVerse refused the request - for example
 * with `500044` (concurrency limit) or `500090` (insufficient balance).
 */
export async function createTextToVideo(
	input: TextToVideoRequest
): Promise<PixverseTaskCreatedResponse> {
	const body = TextToVideoRequestSchema.parse(input);

	const created = await requestPixverse<PixverseTaskCreated>({
		url: "/openapi/v2/video/text/generate",
		method: "POST",
		data: body,
		schema: PixverseTaskCreatedSchema,
		label: "text-to-video response",
		// The call creates a task upstream: it must not be replayed.
		retry: { retryCondition: neverRetry },
	});

	return toTaskCreatedResponse(created);
}

/**
 * The request and response schemas of {@linkcode createTextToVideo}.
 */
export const textToVideoSchema = {
	request: TextToVideoRequestSchema,
	response: PixverseTaskCreatedResponseSchema,
} as const;
