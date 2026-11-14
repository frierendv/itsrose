import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import { claimRoutePrefix, resolvePrefix } from "../prefix";
import { TIKTOK_ROUTE_PREFIX, type TiktokRoutesOptions } from "./options";
import { registerGetContentRoute } from "./routes/get-content";

/**
 * The tiktok routes of the shared surface.
 *
 * @param fastify - The Fastify instance the routes are registered on.
 * @param options - The options of the application.
 */
export const tiktokRoutes: FastifyPluginAsync<TiktokRoutesOptions> = fp(
	async (
		fastify: FastifyInstance,
		options: TiktokRoutesOptions
	): Promise<void> => {
		const prefix = claimRoutePrefix(
			fastify,
			resolvePrefix(options.prefix, TIKTOK_ROUTE_PREFIX),
			"tiktok"
		);

		registerGetContentRoute(fastify, options, prefix);
	},
	{ name: "api-routes-tiktok" }
);

export { TIKTOK_ROUTE_KEYS, TIKTOK_ROUTE_PREFIX } from "./options";
export type { TiktokRouteKey, TiktokRoutesOptions } from "./options";
