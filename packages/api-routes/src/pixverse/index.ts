import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import { claimRoutePrefix, resolvePrefix } from "../prefix";
import { PIXVERSE_ROUTE_PREFIX, type PixverseRoutesOptions } from "./options";
import { registerGetTaskRoute } from "./routes/get-task";
import { registerImageToVideoRoute } from "./routes/image-to-video";
import { registerTextToVideoRoute } from "./routes/text-to-video";

/**
 * The pixverse routes of the shared surface.
 *
 * @param fastify - The Fastify instance the routes are registered on.
 * @param options - The options of the application.
 */
export const pixverseRoutes: FastifyPluginAsync<PixverseRoutesOptions> = fp(
	async (
		fastify: FastifyInstance,
		options: PixverseRoutesOptions
	): Promise<void> => {
		const prefix = claimRoutePrefix(
			fastify,
			resolvePrefix(options.prefix, PIXVERSE_ROUTE_PREFIX),
			"pixverse"
		);

		registerTextToVideoRoute(fastify, options, prefix);
		registerImageToVideoRoute(fastify, options, prefix);
		registerGetTaskRoute(fastify, options, prefix);
	},
	{ name: "api-routes-pixverse" }
);

export { PIXVERSE_ROUTE_KEYS, PIXVERSE_ROUTE_PREFIX } from "./options";
export type { PixverseRouteKey, PixverseRoutesOptions } from "./options";
