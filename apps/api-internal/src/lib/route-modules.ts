import { registerRouteModule } from "@itsrose/api-routes";
import type {
	AudioRoutesOptions,
	InstagramRoutesOptions,
	MtxxRoutesOptions,
	ReminiRoutesOptions,
	TiktokRoutesOptions,
} from "@itsrose/api-routes";
import { audioRoutes } from "@itsrose/api-routes/audio";
import { instagramRoutes } from "@itsrose/api-routes/instagram";
import { mtxxRoutes } from "@itsrose/api-routes/mtxx";
import { reminiRoutes } from "@itsrose/api-routes/remini";
import { tiktokRoutes } from "@itsrose/api-routes/tiktok";
import type { FastifyInstance } from "fastify";

/**
 * The options the internal API mounts the audio routes with.
 *
 * The internal API returns the audio inline and does not publish the audio
 * format header.
 */
const audioRoutesOptions: AudioRoutesOptions = {
	uploadAudioToStorage: false,
	declareAudioResponseHeader: false,
};

/**
 * The options the internal API mounts the instagram routes with.
 */
const instagramRoutesOptions: InstagramRoutesOptions = {};

/**
 * The options the internal API mounts the mtxx routes with.
 */
const mtxxRoutesOptions: MtxxRoutesOptions = {};

/**
 * The options the internal API mounts the remini routes with.
 */
const reminiRoutesOptions: ReminiRoutesOptions = {};

/**
 * The options the internal API mounts the tiktok routes with.
 */
const tiktokRoutesOptions: TiktokRoutesOptions = {};

/**
 * Registers the route modules the internal API serves.
 *
 * The internal API does not serve character.ai: that module is not
 * registered here, so the character.ai client - and the credentials it needs
 * - are never loaded by this application.
 *
 * @param fastify - The Fastify instance the routes are registered on.
 */
export const registerApiRouteModules = async (
	fastify: FastifyInstance
): Promise<void> => {
	await registerRouteModule(fastify, audioRoutes, audioRoutesOptions);
	await registerRouteModule(fastify, instagramRoutes, instagramRoutesOptions);
	await registerRouteModule(fastify, mtxxRoutes, mtxxRoutesOptions);
	await registerRouteModule(fastify, reminiRoutes, reminiRoutesOptions);
	await registerRouteModule(fastify, tiktokRoutes, tiktokRoutesOptions);
};
