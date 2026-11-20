import { neverRetry } from "@itsrose/upstream-client";
import { httpClient } from "../client";
import {
	ElevenLabsDeleteVoiceResponseSchema,
	ElevenLabsDeleteVoiceSchema,
	type IElevenLabsDeleteVoiceResponse,
} from "../zod-schema";

/**
 * Deletes a voice from the ElevenLabs account.
 *
 * The voice id is a path segment, so it is percent-encoded before it is put
 * into the URL: an id carrying a slash or a query separator must address one
 * voice, never another resource.
 *
 * @param {string} voiceId The id of the voice to delete.
 * @returns {Promise<IElevenLabsDeleteVoiceResponse>} The upstream deletion
 * status.
 * @throws {UpstreamApiError} If the ElevenLabs API returns an error status
 * code or answers with a payload that does not match the published schema.
 */
export async function deleteVoice(
	voiceId: string
): Promise<IElevenLabsDeleteVoiceResponse> {
	const { voice_id } = ElevenLabsDeleteVoiceSchema.parse({
		voice_id: voiceId,
	});

	return httpClient.send({
		url: `/v1/voices/${encodeURIComponent(voice_id)}`,
		method: "delete",
		schema: ElevenLabsDeleteVoiceResponseSchema,
		// The call removes a voice upstream: it must not be replayed.
		retry: { retryCondition: neverRetry },
	});
}

/**
 * Zod schemas for delete-voice request and response validation.
 */
export const deleteVoiceSchema = {
	request: ElevenLabsDeleteVoiceSchema,
	response: ElevenLabsDeleteVoiceResponseSchema,
};
