import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import { claimRoutePrefix, resolvePrefix } from "../prefix";
import { MTXX_ROUTE_PREFIX, type MtxxRoutesOptions } from "./options";
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
 * @param fastify - The Fastify instance the routes are registered on.
 * @param options - The options of the application.
 */
export const mtxxRoutes: FastifyPluginAsync<MtxxRoutesOptions> = fp(
	async (
		fastify: FastifyInstance,
		options: MtxxRoutesOptions
	): Promise<void> => {
		const prefix = claimRoutePrefix(
			fastify,
			resolvePrefix(options.prefix, MTXX_ROUTE_PREFIX),
			"mtxx"
		);

		registerClothesSegmentationRoute(fastify, options, prefix);
		registerExpressionGenerationRoute(fastify, options, prefix);
		registerGetTaskRoute(fastify, options, prefix);
		registerImageRestorationRoute(fastify, options, prefix);
		registerOutpaintingRoute(fastify, options, prefix);
		registerRemoveBgRoute(fastify, options, prefix);
		registerVersatileHairstyleRoute(fastify, options, prefix);
	},
	{ name: "api-routes-mtxx" }
);

export { MTXX_ROUTE_KEYS, MTXX_ROUTE_PREFIX } from "./options";
export type { MtxxRouteKey, MtxxRoutesOptions } from "./options";
