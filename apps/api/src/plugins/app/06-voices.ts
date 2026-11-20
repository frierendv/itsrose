import { randomUUID } from "node:crypto";
import { createVoiceAccess } from "@/lib/voice-access";
import { voiceProvider } from "@/lib/voice-provider";
import type { VoiceAccessPort } from "@itsrose/api-routes/audio";
import { createPostgresProviderRegistry } from "@itsrose/auth-resources/registry";
import {
	createVoiceService,
	type VoiceService,
} from "@itsrose/auth-resources/voices";
import { createIVCVoice, getVoices } from "@itsrose/elevenlabs";
import fp from "fastify-plugin";

/* -------------------------------------------------------------------------- */
/*                                   Ports                                    */
/* -------------------------------------------------------------------------- */

/**
 * One clone request the studio voice route may make.
 *
 * The URL is a signed read URL for an asset the route already checked against
 * the caller; the port does not repeat that ownership check.
 */
export type VoiceClonerInput = {
	/** Signed URL of the sample asset. */
	audioUrl: string;
	/** The display name the caller asked the provider to give the voice. */
	name: string;
	/** The description the caller gave the voice, when it gave one. */
	description?: string;
};

/**
 * The upstream voice create/remove pair the studio voice route calls.
 *
 * Declared in the composition root so the route never imports the ElevenLabs
 * client: it hands over a sample URL and receives the created voice id.
 * `remove` reuses the ledger's provider port, so an upstream 404 already
 * means "gone" and a compensating delete of an absent voice still succeeds.
 */
export interface VoiceClonerPort {
	/** Creates one IVC voice from a signed sample URL. */
	create(
		input: VoiceClonerInput
	): Promise<{ voice_id: string; name: string }>;
	/** Removes one upstream voice; resolving means it is gone. */
	remove(voiceId: string): Promise<void>;
}

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
			createVoiceAccess({
				service,
				fetchVoices: getVoices,
				logger: fastify.log,
			})
		);

		/**
		 * The upstream create/remove pair the studio voice route calls.
		 *
		 * Deleting goes through the same provider port the ledger uses, so a
		 * compensating delete and a user delete agree on what "already gone"
		 * means.
		 */
		const voiceCloner: VoiceClonerPort = {
			async create({ audioUrl, name, description }) {
				const created = await createIVCVoice({
					audio_urls: [audioUrl],
					name,
					...(description === undefined ? {} : { description }),
				});

				// The upstream response carries the id and the verification
				// flag; the name is the one the caller asked for.
				return { voice_id: created.voice_id, name };
			},
			remove(voiceId) {
				return voiceProvider.deleteVoice(voiceId);
			},
		};

		void fastify.decorate("voiceCloner", voiceCloner);
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
		/** The upstream create/remove pair the studio voice route calls. */
		voiceCloner: VoiceClonerPort;
	}
}
