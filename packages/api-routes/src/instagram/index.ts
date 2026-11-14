import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import { claimRoutePrefix, resolvePrefix } from "../prefix";
import { INSTAGRAM_ROUTE_PREFIX, type InstagramRoutesOptions } from "./options";
import { registerGetMediaRoute } from "./routes/get-media";

/**
 * The instagram routes of the shared surface.
 *
 * @param fastify - The Fastify instance the routes are registered on.
 * @param options - The options of the application.
 */
export const instagramRoutes: FastifyPluginAsync<InstagramRoutesOptions> = fp(
	async (
		fastify: FastifyInstance,
		options: InstagramRoutesOptions
	): Promise<void> => {
		const prefix = claimRoutePrefix(
			fastify,
			resolvePrefix(options.prefix, INSTAGRAM_ROUTE_PREFIX),
			"instagram"
		);

		registerGetMediaRoute(fastify, options, prefix);
	},
	{ name: "api-routes-instagram" }
);

export { INSTAGRAM_ROUTE_KEYS, INSTAGRAM_ROUTE_PREFIX } from "./options";
export type { InstagramRouteKey, InstagramRoutesOptions } from "./options";
