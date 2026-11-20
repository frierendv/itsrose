import type { FastifyRequest } from "fastify";
import type { AudioRoutesOptions } from "./options";

/**
 * Asserts that the caller may use every voice id of a synthesis request.
 *
 * The check runs before the upstream call so a refused voice never spends an
 * upstream generation. Without the ownership port the function is a no-op:
 * the module keeps its pre-ownership behaviour for the application that mounts
 * it without a voice ledger.
 *
 * @param options - The capabilities of the mounting application.
 * @param request - The synthesis request being served.
 * @param voiceIds - Every `voice_id` the request body carries, in input order.
 * @throws {VoiceAccessDeniedError} When the caller may not use a voice.
 */
export async function assertVoiceIdsAllowed(
	options: AudioRoutesOptions,
	request: FastifyRequest,
	voiceIds: readonly string[]
): Promise<void> {
	const voiceAccess = options.voiceAccess;
	if (!voiceAccess) {
		return;
	}

	// A dialogue may name the same voice in several inputs; asserting it once
	// is enough and keeps the ownership lookup count proportional to the
	// distinct voices of the request.
	for (const voiceId of new Set(voiceIds)) {
		await voiceAccess.assertCanUseVoice(request, voiceId);
	}
}
