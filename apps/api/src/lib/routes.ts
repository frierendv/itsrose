import { AUDIO_ROUTE_PREFIX } from "@itsrose/api-routes/audio";
import {
	CHARACTER_AI_ROUTE_PREFIX,
	characterAiRoutes,
} from "@itsrose/api-routes/character-ai";
import {
	INSTAGRAM_ROUTE_PREFIX,
	instagramRoutes,
} from "@itsrose/api-routes/instagram";
import { MTXX_ROUTE_PREFIX, mtxxRoutes } from "@itsrose/api-routes/mtxx";
import {
	PIXVERSE_ROUTE_PREFIX,
	pixverseRoutes,
} from "@itsrose/api-routes/pixverse";
import { REMINI_ROUTE_PREFIX, reminiRoutes } from "@itsrose/api-routes/remini";
import { TIKTOK_ROUTE_PREFIX, tiktokRoutes } from "@itsrose/api-routes/tiktok";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { audioRoutesPlugin } from "./audio-routes";

/**
 * The version of the public REST surface. Part of the public URL.
 */
export const API_VERSION = "/v1";

/**
 * The public REST surface, mounted at `/{version}/{module}`.
 *
 * The table is explicit on purpose: a folder name must not decide a public
 * URL. Every module of the shared surface the public API serves is listed
 * here, under its own namespace, and nothing else is exposed.
 *
 * @param fastify - The Fastify instance the routes are registered on.
 */
const versionedRoutes: FastifyPluginAsync = async (fastify): Promise<void> => {
	await fastify.register(audioRoutesPlugin, { prefix: AUDIO_ROUTE_PREFIX });
	await fastify.register(characterAiRoutes, {
		prefix: CHARACTER_AI_ROUTE_PREFIX,
	});
	await fastify.register(instagramRoutes, {
		prefix: INSTAGRAM_ROUTE_PREFIX,
	});
	await fastify.register(mtxxRoutes, { prefix: MTXX_ROUTE_PREFIX });
	await fastify.register(pixverseRoutes, { prefix: PIXVERSE_ROUTE_PREFIX });
	await fastify.register(reminiRoutes, { prefix: REMINI_ROUTE_PREFIX });
	await fastify.register(tiktokRoutes, { prefix: TIKTOK_ROUTE_PREFIX });
};

/**
 * Registers the public, versioned route surface on an application.
 *
 * @param fastify - The Fastify instance the routes are registered on.
 */
export const registerVersionedRoutes = async (
	fastify: FastifyInstance
): Promise<void> => {
	await fastify.register(versionedRoutes, { prefix: API_VERSION });
};
