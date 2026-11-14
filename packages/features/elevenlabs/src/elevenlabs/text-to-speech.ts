import { neverRetry, parseUpstreamPayload } from "@itsrose/upstream-client";
import { httpClient } from "../client";
import {
	ElevenLabsSharedResponseSchema,
	ElevenLabsTextToSpeechConvertSchema,
	WithTimestampSchema,
} from "../zod-schema";
import type {
	IElevenLabsSharedResponse,
	IElevenLabsTextToSpeechConvert,
	WithTimestamp,
} from "../zod-schema";

/**
 * Converts text into spoken audio using ElevenLabs Text-to-Speech API.
 *
 * @param {IElevenLabsTextToSpeechConvert} options Speech conversion options including voice ID, text, and model settings.
 * @returns {Promise<IElevenLabsSharedResponse>} Object containing base64-encoded audio data.
 * @throws {UpstreamApiError} If the ElevenLabs API returns an error status code
 * or answers with a payload that does not match the published schema.
 */
export async function textToSpeech(
	options: IElevenLabsTextToSpeechConvert
): Promise<IElevenLabsSharedResponse> {
	const { voice_id, output_format, ...restOptions } = options;
	const audio = await httpClient.send<Buffer>({
		url: `/v1/text-to-speech/${voice_id}`,
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
		{ service: "elevenlabs", label: "speech" }
	);
}

export async function textToSpeechWithTiming(
	options: IElevenLabsTextToSpeechConvert
): Promise<IElevenLabsSharedResponse & WithTimestamp> {
	const { voice_id, output_format, ...restOptions } = options;
	const data = await httpClient.send<
		{ audio_base64: string } & WithTimestamp
	>({
		url: `/v1/text-to-speech/${voice_id}/with-timestamps`,
		method: "post",
		data: restOptions,
		params: {
			output_format,
			enable_logging: false,
		},
		// The call is billed per generation: it must not be replayed.
		retry: { retryCondition: neverRetry },
	});

	const { audio_base64: audio, ...rest } = data;

	return parseUpstreamPayload(
		WithTimestampSchema.extend(ElevenLabsSharedResponseSchema.shape),
		{ audio, ...rest },
		{ service: "elevenlabs", label: "speech" }
	);
}

/**
 * Zod schemas for text-to-speech request and response validation.
 */
export const textToSpeechSchema = {
	request: ElevenLabsTextToSpeechConvertSchema,
	response: ElevenLabsSharedResponseSchema,
};
