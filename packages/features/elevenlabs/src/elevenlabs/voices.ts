import { ThirdPartyApiError } from "@itsrose/system";
import { httpClient, parseElevenLabsError } from "../client";
import {
	ElevenLabsListVoicesResponseSchema,
	ElevenLabsListVoicesSchema,
	type IElevenLabsListVoices,
	type IElevenLabsListVoicesResponse,
} from "../zod-schema";

const redact = (text: string) =>
	text
		.replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[EMAIL]")
		.replace(/\b(?:\+?\d[\d\s()-]{7,}\d)\b/g, "[PHONE]")
		.replace(/\bhttps?:\/\/\S+/gi, "[URL]");

/**
 * Retrieves a list of available ElevenLabs voices with sensitive user info redacted.
 *
 * @param {IElevenLabsListVoices} [options] Optional query parameters for filtering voices.
 * @returns {Promise<IElevenLabsListVoicesResponse>} List of voices and response metadata.
 * @throws {ThirdPartyApiError} If the ElevenLabs API returns an error status code.
 */
export async function getVoices(
	options?: IElevenLabsListVoices
): Promise<IElevenLabsListVoicesResponse> {
	const { data, error } = await httpClient
		.get<IElevenLabsListVoicesResponse>("/v2/voices", {
			params: options,
		})
		.onError(parseElevenLabsError);
	if (error) {
		throw new ThirdPartyApiError(error.message, error.statusCode);
	}
	data.voices.forEach((voice) => {
		voice.name = redact(voice.name);
	});
	return data;
}

/**
 * Zod schemas for voice list request and response validation.
 */
export const getVoicesSchema = {
	request: ElevenLabsListVoicesSchema,
	response: ElevenLabsListVoicesResponseSchema,
};
