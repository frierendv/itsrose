import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { registerGetMediaRoute } from "./routes/get-media";

/**
 * The instagram routes of the shared surface.
 *
 * The routes are relative: they live under whatever prefix the mounting
 * application registers the module with.
 *
 * @param fastify - The Fastify instance the routes are registered on.
 */
export const instagramRoutes: FastifyPluginAsync = async (
	fastify: FastifyInstance
): Promise<void> => {
	registerGetMediaRoute(fastify);
};

export { INSTAGRAM_ROUTE_KEYS, INSTAGRAM_ROUTE_PREFIX } from "./options";
export type { InstagramRouteKey } from "./options";
