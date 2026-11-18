import { neverRetry } from "@itsrose/upstream-client";
import { requestPixverse } from "../client/send";
import type { PixverseTaskCreated, TextToVideoRequest } from "../zod-schema";
import {
	PixverseTaskCreatedSchema,
	TextToVideoRequestSchema,
} from "../zod-schema";

/**
 * Creates a video from a text prompt.
 *
 * The call is accepted when PixVerse answers `ErrCode=0` with a `video_id`;
 * it does not mean the video was rendered. Poll {@linkcode getTask} with the
 * returned identifier, or pass a `webhook_id` and wait for the callback.
 *
 * @param input The generation request.
 * @returns The identifier of the accepted task and the credits it is
 * expected to consume.
 * @throws {UpstreamApiError} When PixVerse refused the request - for example
 * with `500044` (concurrency limit) or `500090` (insufficient balance).
 */
export async function createTextToVideo(
	input: TextToVideoRequest
): Promise<PixverseTaskCreated> {
	const body = TextToVideoRequestSchema.parse(input);

	return requestPixverse({
		url: "/openapi/v2/video/text/generate",
		method: "POST",
		data: body,
		schema: PixverseTaskCreatedSchema,
		label: "text-to-video response",
		// The call creates a task upstream: it must not be replayed.
		retry: { retryCondition: neverRetry },
	});
}
