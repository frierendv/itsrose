import { ThirdPartyApiError } from "@itsrose/system";
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
	const {
		data: mixed,
		error,
		headers,
	} = await httpClient.post<Buffer>("/v1/music/detailed", options, {
		responseType: "arraybuffer",
	});
	if (error) {
		throw new ThirdPartyApiError(error.message, error.statusCode);
	}

	// TODO: parsing mixed/multipart response from elevenlabs
	const contentType = (headers["content-type"] || "").toString();
	const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);

	if (!boundaryMatch) {
		throw new ThirdPartyApiError(
			"No boundary found in Content-Type header",
			500
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
	return data as MusicComposeDetailedResponse;
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
	const { data, error } = await httpClient.post<MusicComposePlanResponse>(
		"/v1/music/plan",
		options
	);
	if (error) {
		throw new ThirdPartyApiError(error.message, error.statusCode);
	}
	return data;
}

export const musicComposePlanSchema = {
	request: MusicComposePlanSchema,
	response: MusicComposePlanResponseSchema,
};
