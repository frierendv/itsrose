import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import { claimRoutePrefix, resolvePrefix } from "../prefix";
import { REMINI_ROUTE_PREFIX, type ReminiRoutesOptions } from "./options";
import { registerCreateTaskRoute } from "./routes/create-task";

/**
 * The remini routes of the shared surface.
 *
 * @param fastify - The Fastify instance the routes are registered on.
 * @param options - The options of the application.
 */
export const reminiRoutes: FastifyPluginAsync<ReminiRoutesOptions> = fp(
	async (
		fastify: FastifyInstance,
		options: ReminiRoutesOptions
	): Promise<void> => {
		const prefix = claimRoutePrefix(
			fastify,
			resolvePrefix(options.prefix, REMINI_ROUTE_PREFIX),
			"remini"
		);

		registerCreateTaskRoute(fastify, options, prefix);
	},
	{ name: "api-routes-remini" }
);

export { REMINI_ROUTE_KEYS, REMINI_ROUTE_PREFIX } from "./options";
export type { ReminiRouteKey, ReminiRoutesOptions } from "./options";
