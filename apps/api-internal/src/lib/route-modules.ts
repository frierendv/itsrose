import { AUDIO_ROUTE_PREFIX, audioRoutes } from "@itsrose/api-routes/audio";
import {
	INSTAGRAM_ROUTE_PREFIX,
	instagramRoutes,
} from "@itsrose/api-routes/instagram";
import { MTXX_ROUTE_PREFIX, mtxxRoutes } from "@itsrose/api-routes/mtxx";
import { REMINI_ROUTE_PREFIX, reminiRoutes } from "@itsrose/api-routes/remini";
import { TIKTOK_ROUTE_PREFIX, tiktokRoutes } from "@itsrose/api-routes/tiktok";
import type { FastifyInstance } from "fastify";

/**
 * Registers the route modules the internal API serves.
 *
 * The internal API does not serve character.ai: that module is not
 * registered here, so the character.ai client - and the credentials it needs
 * - are never loaded by this application.
 *
 * The paths stay unversioned and independent of the public API: the facade's
 * URLs are JojApi's decision, not a version of this surface. The internal API
 * returns the generated audio inline and does not publish the audio format
 * header, so it mounts the audio module without a storage port.
 *
 * @param fastify - The Fastify instance the routes are registered on.
 */
export const registerApiRouteModules = async (
	fastify: FastifyInstance
): Promise<void> => {
	await fastify.register(audioRoutes, {
		prefix: AUDIO_ROUTE_PREFIX,
		declareAudioResponseHeader: false,
	});
	await fastify.register(instagramRoutes, {
		prefix: INSTAGRAM_ROUTE_PREFIX,
	});
	await fastify.register(mtxxRoutes, { prefix: MTXX_ROUTE_PREFIX });
	await fastify.register(reminiRoutes, { prefix: REMINI_ROUTE_PREFIX });
	await fastify.register(tiktokRoutes, { prefix: TIKTOK_ROUTE_PREFIX });
};
