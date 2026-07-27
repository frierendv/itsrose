import { ThirdPartyApiError } from "@itsrose/system";
import { httpClient, parseElevenLabsError } from "../client";
import {
	ElevenLabsSharedResponseSchema,
	ElevenLabsTextToSpeechConvertSchema,
} from "../zod-schema";
import type {
	IElevenLabsSharedResponse,
	IElevenLabsTextToSpeechConvert,
} from "../zod-schema";

/**
 * Converts text into spoken audio using ElevenLabs Text-to-Speech API.
 *
 * @param {IElevenLabsTextToSpeechConvert} options Speech conversion options including voice ID, text, and model settings.
 * @returns {Promise<IElevenLabsSharedResponse>} Object containing base64-encoded audio data.
 * @throws {ThirdPartyApiError} If the ElevenLabs API returns an error status code.
 */
export async function textToSpeech(
	options: IElevenLabsTextToSpeechConvert
): Promise<IElevenLabsSharedResponse> {
	const { voice_id, output_format, ...restOptions } = options;
	const { data, error } = await httpClient
		.post<Buffer>(`/v1/text-to-speech/${voice_id}`, restOptions, {
			params: {
				output_format,
				enable_logging: false,
			},
			responseType: "arraybuffer",
		})
		.onError(parseElevenLabsError);
	if (error) {
		throw new ThirdPartyApiError(error.message, error.statusCode);
	}
	return {
		audio_base64: Buffer.from(data).toString("base64"),
	};
}

/**
 * Zod schemas for text-to-speech request and response validation.
 */
export const textToSpeechSchema = {
	request: ElevenLabsTextToSpeechConvertSchema,
	response: ElevenLabsSharedResponseSchema,
};
