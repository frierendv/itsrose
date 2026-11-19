import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { registerCreateTaskRoute } from "./routes/create-task";

/**
 * The remini routes of the shared surface.
 *
 * The routes are relative: they live under whatever prefix the mounting
 * application registers the module with.
 *
 * @param fastify - The Fastify instance the routes are registered on.
 */
export const reminiRoutes: FastifyPluginAsync = async (
	fastify: FastifyInstance
): Promise<void> => {
	registerCreateTaskRoute(fastify);
};

export { REMINI_ROUTE_KEYS, REMINI_ROUTE_PREFIX } from "./options";
export type { ReminiRouteKey } from "./options";
