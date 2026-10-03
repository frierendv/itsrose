import { ThirdPartyApiError } from "@itsrose/system";
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
 * @throws {ThirdPartyApiError} If the ElevenLabs API returns an error status code.
 */
export async function textToDialogue(
	options: IElevenLabsTextToDialogueConvert
): Promise<IElevenLabsSharedResponse> {
	const { output_format, ...restOptions } = options;
	const { data, error } = await httpClient.post<Buffer>(
		"/v1/text-to-dialogue",
		restOptions,
		{
			params: {
				output_format,
				enable_logging: false,
			},
			responseType: "arraybuffer",
		}
	);
	if (error) {
		throw new ThirdPartyApiError(error.message, error.statusCode);
	}
	return {
		audio_base64: Buffer.from(data).toString("base64"),
	};
}

/**
 * Zod schemas for text-to-dialogue request and response validation.
 */
export const textToDialogueSchema = {
	request: ElevenLabsTextToDialogueConvertSchema,
	response: ElevenLabsSharedResponseSchema,
};
