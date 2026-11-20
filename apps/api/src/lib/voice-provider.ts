import type { VoiceProviderPort } from "@itsrose/auth-resources/voices";
import { deleteVoice } from "@itsrose/elevenlabs";
import { ThirdPartyApiError } from "@itsrose/system";

/**
 * Whether an upstream delete failed because the voice is already gone.
 *
 * The ElevenLabs client maps an upstream refusal onto its own status code, so
 * a 404 here means the upstream object no longer exists. That is success for
 * a delete: the ledger row can be tombstoned instead of staying live forever
 * and blocking the retry.
 *
 * @param error The error the feature client raised.
 * @returns `true` when the upstream voice does not exist anymore.
 */
const isUpstreamNotFound = (error: unknown): boolean =>
	error instanceof ThirdPartyApiError && error.statusCode === 404;

/**
 * The upstream voice port, over the ElevenLabs client.
 *
 * `@itsrose/auth-resources` never imports the feature client: the application
 * composes this port and hands it to the ledger service and to the
 * account-deletion cascade, so both agree on what "the voice is gone" means.
 */
export const voiceProvider: VoiceProviderPort = {
	async deleteVoice(voiceId) {
		try {
			await deleteVoice(voiceId);
		} catch (error) {
			// Already deleted upstream is the outcome the caller asked for.
			// Every other failure stays retryable and leaves the row live.
			if (isUpstreamNotFound(error)) {
				return;
			}
			throw error;
		}
	},
};
