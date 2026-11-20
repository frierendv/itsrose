import { randomUUID } from "node:crypto";
import { createVoiceAccess } from "@/lib/voice-access";
import { voiceProvider } from "@/lib/voice-provider";
import type { VoiceAccessPort } from "@itsrose/api-routes/audio";
import { createPostgresProviderRegistry } from "@itsrose/auth-resources/registry";
import {
	createVoiceService,
	type VoiceService,
} from "@itsrose/auth-resources/voices";
import { getVoices } from "@itsrose/elevenlabs";
import fp from "fastify-plugin";

/**
 * The user-owned voice ledger, wired to the app's database and ElevenLabs.
 *
 * The service lives in `@itsrose/auth-resources/voices` and owns the
 * ownership rules; this plugin supplies the ports (the Postgres registry and
 * the upstream delete) and exposes the service and the access port the audio
 * routes enforce ownership through.
 *
 * The access port fails fast when it is called before a user context exists:
 * a misordered guard raises `VoiceAccessUnavailableError` instead of silently
 * treating the request as unowned.
 */
export default fp(
	async (fastify) => {
		const registry = createPostgresProviderRegistry(fastify.database);
		const service = createVoiceService({
			registry,
			provider: voiceProvider,
			clock: () => new Date(),
			newId: () => randomUUID(),
		});

		void fastify.decorate("voiceService", service);
		void fastify.decorate(
			"voiceAccess",
			createVoiceAccess({ service, fetchVoices: getVoices })
		);
	},
	{
		name: "voices",
		dependencies: ["database"],
	}
);

declare module "fastify" {
	interface FastifyInstance {
		/** The user-owned upstream voice ledger. */
		voiceService: VoiceService;
		/** The ownership port the audio routes enforce through. */
		voiceAccess: VoiceAccessPort;
	}
}
