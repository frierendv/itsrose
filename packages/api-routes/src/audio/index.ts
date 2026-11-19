import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { type AudioRoutesOptions } from "./options";
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
 * The routes are relative: they live under whatever prefix the mounting
 * application registers the module with. A module is registered on its own,
 * so an application that does not speak audio never loads the ElevenLabs
 * client.
 *
 * @param fastify - The Fastify instance the routes are registered on.
 * @param options - The capabilities of the mounting application.
 */
export const audioRoutes: FastifyPluginAsync<AudioRoutesOptions> = async (
	fastify: FastifyInstance,
	options: AudioRoutesOptions
): Promise<void> => {
	registerCreateIvcVoiceRoute(fastify);
	registerGetModelsRoute(fastify);
	registerGetVoicesRoute(fastify);
	registerMusicRoutes(fastify, options);
	registerSpeechToSpeechRoute(fastify, options);
	registerTextToDialogueRoute(fastify, options);
	registerTextToSpeechRoutes(fastify, options);
};

export { AUDIO_ROUTE_KEYS, AUDIO_ROUTE_PREFIX } from "./options";
export type { AudioRouteKey, AudioRoutesOptions } from "./options";
export {
	uploadAudio,
	uploadUnlessBase64,
	uploadWhenUrlRequested,
} from "./upload";
export type { AudioFormat, AudioUploadCondition } from "./upload";
