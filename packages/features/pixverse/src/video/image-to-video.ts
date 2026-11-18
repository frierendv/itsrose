import { neverRetry } from "@itsrose/upstream-client";
import { requestPixverse } from "../client/send";
import { toTaskCreatedResponse } from "../utils/translate-task";
import type {
	ImageToVideoRequest,
	PixverseTaskCreated,
	PixverseTaskCreatedResponse,
} from "../zod-schema";
import {
	ImageToVideoRequestSchema,
	PixverseTaskCreatedResponseSchema,
	PixverseTaskCreatedSchema,
} from "../zod-schema";

/**
 * Creates a video from one uploaded image, or from a template.
 *
 * A normal task names the image with `img_id`; a template task names the
 * template with `template_id` and the images that template declares. The
 * request is validated before it is sent, so a request that is neither is
 * refused locally instead of upstream.
 *
 * @param input The generation request.
 * @returns The accepted task, in the status vocabulary this package
 * publishes.
 * @throws {UpstreamApiError} When PixVerse refused the request.
 */
export async function createImageToVideo(
	input: ImageToVideoRequest
): Promise<PixverseTaskCreatedResponse> {
	const body = ImageToVideoRequestSchema.parse(input);

	const created = await requestPixverse<PixverseTaskCreated>({
		url: "/openapi/v2/video/img/generate",
		method: "POST",
		data: body,
		schema: PixverseTaskCreatedSchema,
		label: "image-to-video response",
		// The call creates a task upstream: it must not be replayed.
		retry: { retryCondition: neverRetry },
	});

	return toTaskCreatedResponse(created);
}

/**
 * The request and response schemas of {@linkcode createImageToVideo}.
 */
export const imageToVideoSchema = {
	request: ImageToVideoRequestSchema,
	response: PixverseTaskCreatedResponseSchema,
} as const;
