import { httpClient } from "../client";
import { redact } from "../utils";
import {
	ElevenLabsListVoicesResponseSchema,
	ElevenLabsListVoicesSchema,
	type IElevenLabsListVoices,
	type IElevenLabsListVoicesResponse,
} from "../zod-schema";

/**
 * Retrieves a list of available ElevenLabs voices with sensitive user info redacted.
 *
 * @param {IElevenLabsListVoices} [options] Optional query parameters for filtering voices.
 * @returns {Promise<IElevenLabsListVoicesResponse>} List of voices and response metadata.
 * @throws {UpstreamApiError} If the ElevenLabs API returns an error status code
 * or answers with a payload that does not match the published schema.
 */
export async function getVoices(
	options?: IElevenLabsListVoices
): Promise<IElevenLabsListVoicesResponse> {
	const data = await httpClient.send({
		url: "/v2/voices",
		params: options,
		schema: ElevenLabsListVoicesResponseSchema,
	});

	void data.voices.forEach((voice) => {
		voice.name = redact(voice.name);
		if (voice.description) {
			voice.description = redact(voice.description);
		}
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
