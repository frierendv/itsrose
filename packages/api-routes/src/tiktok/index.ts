import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { registerGetContentRoute } from "./routes/get-content";

/**
 * The tiktok routes of the shared surface.
 *
 * The routes are relative: they live under whatever prefix the mounting
 * application registers the module with.
 *
 * @param fastify - The Fastify instance the routes are registered on.
 */
export const tiktokRoutes: FastifyPluginAsync = async (
	fastify: FastifyInstance
): Promise<void> => {
	registerGetContentRoute(fastify);
};

export { TIKTOK_ROUTE_KEYS, TIKTOK_ROUTE_PREFIX } from "./options";
export type { TiktokRouteKey } from "./options";
