import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import { claimRoutePrefix, resolvePrefix } from "../prefix";
import { AUDIO_ROUTE_PREFIX, type AudioRoutesOptions } from "./options";
import { registerCreateIvcVoiceRoute } from "./routes/create-ivc-voice";
import { registerGetModelsRoute } from "./routes/get-models";
import { registerGetVoicesRoute } from "./routes/get-voices";
import { registerMusicRoutes } from "./routes/music";
import { registerSpeechToSpeechRoute } from "./routes/speech-to-speech";
import { registerTextToDialogueRoute } from "./routes/text-to-dialogue";
import { registerTextToSpeechRoutes } from "./routes/text-to-speech";

/**
 * The audio routes of the shared surface.
 *
 * The module owns its namespace: it builds the URLs of its routes from the
 * prefix it was given, so it is mounted under `/audio` by default and
 * wherever the app asks for otherwise. A module is registered on its own, so
 * an application that does not speak audio never loads the ElevenLabs client.
 *
 * @param fastify - The Fastify instance the routes are registered on.
 * @param options - The options of the application.
 */
export const audioRoutes: FastifyPluginAsync<AudioRoutesOptions> = fp(
	async (
		fastify: FastifyInstance,
		options: AudioRoutesOptions
	): Promise<void> => {
		const prefix = claimRoutePrefix(
			fastify,
			resolvePrefix(options.prefix, AUDIO_ROUTE_PREFIX),
			"audio"
		);

		registerCreateIvcVoiceRoute(fastify, options, prefix);
		registerGetModelsRoute(fastify, options, prefix);
		registerGetVoicesRoute(fastify, options, prefix);
		registerMusicRoutes(fastify, options, prefix);
		registerSpeechToSpeechRoute(fastify, options, prefix);
		registerTextToDialogueRoute(fastify, options, prefix);
		registerTextToSpeechRoutes(fastify, options, prefix);
	},
	{ name: "api-routes-audio" }
);

export { AUDIO_ROUTE_KEYS, AUDIO_ROUTE_PREFIX } from "./options";
export type { AudioRouteKey, AudioRoutesOptions } from "./options";
export {
	uploadAudio,
	uploadUnlessBase64,
	uploadWhenUrlRequested,
} from "./upload";
export type { AudioFormat, AudioUploadCondition } from "./upload";
