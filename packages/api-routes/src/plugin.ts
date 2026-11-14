import type { FastifyPluginAsync } from "fastify";
import type { SharedRoutesOptions } from "./options";
import { registerCreateIvcVoiceRoute } from "./routes/audio/create-ivc-voice";
import { registerGetModelsRoute } from "./routes/audio/get-models";
import { registerGetVoicesRoute } from "./routes/audio/get-voices";
import { registerMusicRoutes } from "./routes/audio/music";
import { registerSpeechToSpeechRoute } from "./routes/audio/speech-to-speech";
import { registerTextToDialogueRoute } from "./routes/audio/text-to-dialogue";
import { registerTextToSpeechRoutes } from "./routes/audio/text-to-speech";
import { registerGetMediaRoute } from "./routes/instagram/get-media";
import { registerClothesSegmentationRoute } from "./routes/mtxx/clothes-segmentation";
import { registerExpressionGenerationRoute } from "./routes/mtxx/expression-generation";
import { registerImageRestorationRoute } from "./routes/mtxx/image-restoration";
import { registerOutpaintingRoute } from "./routes/mtxx/outpainting";
import { registerRemoveBgRoute } from "./routes/mtxx/remove-bg";
import { registerVersatileHairstyleRoute } from "./routes/mtxx/versatile-hairstyle";
import { registerCreateTaskRoute } from "./routes/remini/create-task";
import { registerGetContentRoute } from "./routes/tiktok/get-content";

/**
 * The route surface `apps/api` and `apps/api-internal` have in common.
 *
 * The routes are registered once, here; what the two apps do differently is
 * data: whether generated audio is uploaded to object storage, whether the
 * audio format header is declared, and the OpenAPI text of the routes that
 * are documented differently.
 */
export const sharedRoutes: FastifyPluginAsync<SharedRoutesOptions> = async (
	fastify,
	options
): Promise<void> => {
	registerCreateIvcVoiceRoute(fastify, options);
	registerGetModelsRoute(fastify, options);
	registerGetVoicesRoute(fastify, options);
	registerMusicRoutes(fastify, options);
	registerSpeechToSpeechRoute(fastify, options);
	registerTextToDialogueRoute(fastify, options);
	registerTextToSpeechRoutes(fastify, options);
	registerGetMediaRoute(fastify, options);
	registerClothesSegmentationRoute(fastify, options);
	registerExpressionGenerationRoute(fastify, options);
	registerImageRestorationRoute(fastify, options);
	registerOutpaintingRoute(fastify, options);
	registerRemoveBgRoute(fastify, options);
	registerVersatileHairstyleRoute(fastify, options);
	registerCreateTaskRoute(fastify, options);
	registerGetContentRoute(fastify, options);
};
