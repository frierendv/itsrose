import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { registerGetTaskRoute } from "./routes/get-task";
import { registerImageToVideoRoute } from "./routes/image-to-video";
import { registerTextToVideoRoute } from "./routes/text-to-video";

/**
 * The pixverse routes of the shared surface.
 *
 * The routes are relative: they live under whatever prefix the mounting
 * application registers the module with.
 *
 * @param fastify - The Fastify instance the routes are registered on.
 */
export const pixverseRoutes: FastifyPluginAsync = async (
	fastify: FastifyInstance
): Promise<void> => {
	registerTextToVideoRoute(fastify);
	registerImageToVideoRoute(fastify);
	registerGetTaskRoute(fastify);
};

export { PIXVERSE_ROUTE_KEYS, PIXVERSE_ROUTE_PREFIX } from "./options";
export type { PixverseRouteKey } from "./options";
