import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { registerClothesSegmentationRoute } from "./routes/clothes-segmentation";
import { registerExpressionGenerationRoute } from "./routes/expression-generation";
import { registerGetTaskRoute } from "./routes/get-task";
import { registerImageRestorationRoute } from "./routes/image-restoration";
import { registerOutpaintingRoute } from "./routes/outpainting";
import { registerRemoveBgRoute } from "./routes/remove-bg";
import { registerVersatileHairstyleRoute } from "./routes/versatile-hairstyle";

/**
 * The mtxx routes of the shared surface.
 *
 * The routes are relative: they live under whatever prefix the mounting
 * application registers the module with.
 *
 * @param fastify - The Fastify instance the routes are registered on.
 */
export const mtxxRoutes: FastifyPluginAsync = async (
	fastify: FastifyInstance
): Promise<void> => {
	registerClothesSegmentationRoute(fastify);
	registerExpressionGenerationRoute(fastify);
	registerGetTaskRoute(fastify);
	registerImageRestorationRoute(fastify);
	registerOutpaintingRoute(fastify);
	registerRemoveBgRoute(fastify);
	registerVersatileHairstyleRoute(fastify);
};

export { MTXX_ROUTE_KEYS, MTXX_ROUTE_PREFIX } from "./options";
export type { MtxxRouteKey } from "./options";
