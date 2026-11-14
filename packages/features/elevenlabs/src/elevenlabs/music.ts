import {
	neverRetry,
	parseUpstreamPayload,
	UpstreamApiError,
} from "@itsrose/upstream-client";
import { parseMultipart } from "@remix-run/multipart-parser/node";
import { httpClient } from "../client";
import type {
	MusicCompose,
	MusicComposeDetailedResponse,
	MusicComposePlan,
	MusicComposePlanResponse,
} from "../zod-schema";
import {
	MusicComposeDetailedResponseSchema,
	MusicComposePlanResponseSchema,
	MusicComposePlanSchema,
	MusicComposeSchema,
} from "../zod-schema";

export async function musicCompose(
	options: MusicCompose
): Promise<MusicComposeDetailedResponse> {
	const { data: mixed, headers } = await httpClient.sendWithResponse<Buffer>({
		url: "/v1/music/detailed",
		method: "post",
		data: options,
		responseType: "arraybuffer",
		// The call is billed per composition: it must not be replayed.
		retry: { retryCondition: neverRetry },
	});

	// TODO: parsing mixed/multipart response from elevenlabs
	const contentType = String(headers["content-type"] ?? "");
	const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);

	if (!boundaryMatch) {
		throw new UpstreamApiError(
			"No boundary found in Content-Type header",
			500,
			{ service: "elevenlabs" }
		);
	}
	const boundary = (boundaryMatch[1] || boundaryMatch[2])!;

	const data = {};

	const multipartMixed = parseMultipart(mixed, {
		boundary,
		maxFileSize: 10 * 1024 * 1024,
	});

	for await (const part of multipartMixed) {
		if (part.mediaType === "application/json") {
			const body = JSON.parse(part.text) as Omit<
				MusicComposeDetailedResponse,
				"audio"
			>;
			Object.assign(data, body);
		}
		if (part.mediaType && part.isFile) {
			// the audio file
			const body = Buffer.from(part.arrayBuffer).toString("base64");
			Object.assign(data, { audio: body });
		}
	}

	return parseUpstreamPayload(MusicComposeDetailedResponseSchema, data, {
		service: "elevenlabs",
		label: "composition",
	});
}
export const musicComposeSchema = {
	request: MusicComposeSchema,
	response: MusicComposeDetailedResponseSchema,
};

/**
 * Ref: https://elevenlabs.io/docs/api-reference/music/create-composition-plan
 *
 * @param {MusicComposePlan} options
 * @returns {Promise<MusicComposePlanResponse>}
 */
export async function musicComposePlan(
	options: MusicComposePlan
): Promise<MusicComposePlanResponse> {
	return httpClient.send({
		url: "/v1/music/plan",
		method: "post",
		data: options,
		schema: MusicComposePlanResponseSchema,
		// The call is billed per plan: it must not be replayed.
		retry: { retryCondition: neverRetry },
	});
}

export const musicComposePlanSchema = {
	request: MusicComposePlanSchema,
	response: MusicComposePlanResponseSchema,
};
