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
 * Description placeholder
 *
 * @param {?IElevenLabsListVoices} [options]
 * @returns {Promise<IElevenLabsListVoicesResponse>}
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

export const getVoicesSchema = {
	request: ElevenLabsListVoicesSchema,
	response: ElevenLabsListVoicesResponseSchema,
};
