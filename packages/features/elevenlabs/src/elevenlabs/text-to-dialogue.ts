import { neverRetry, parseUpstreamPayload } from "@itsrose/upstream-client";
import { httpClient } from "../client";
import {
	ElevenLabsSharedResponseSchema,
	ElevenLabsTextToDialogueConvertSchema,
	type IElevenLabsSharedResponse,
	type IElevenLabsTextToDialogueConvert,
} from "../zod-schema";

/**
 * Converts dialogue text lines into spoken audio using ElevenLabs Text-to-Dialogue API.
 *
 * @param {IElevenLabsTextToDialogueConvert} options Dialogue parameters including text inputs and voice mappings.
 * @returns {Promise<IElevenLabsSharedResponse>} Object containing base64-encoded audio data.
 * @throws {UpstreamApiError} If the ElevenLabs API returns an error status code
 * or answers with a payload that does not match the published schema.
 */
export async function textToDialogue(
	options: IElevenLabsTextToDialogueConvert
): Promise<IElevenLabsSharedResponse> {
	const { output_format, ...restOptions } = options;
	const audio = await httpClient.send<Buffer>({
		url: "/v1/text-to-dialogue",
		method: "post",
		data: restOptions,
		params: {
			output_format,
			enable_logging: false,
		},
		responseType: "arraybuffer",
		// The call is billed per generation: it must not be replayed.
		retry: { retryCondition: neverRetry },
	});

	return parseUpstreamPayload(
		ElevenLabsSharedResponseSchema,
		{ audio: Buffer.from(audio).toString("base64") },
		{ service: "elevenlabs", label: "dialogue" }
	);
}

/**
 * Zod schemas for text-to-dialogue request and response validation.
 */
export const textToDialogueSchema = {
	request: ElevenLabsTextToDialogueConvertSchema,
	response: ElevenLabsSharedResponseSchema,
};
