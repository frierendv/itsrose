import type { FastifyRequest } from "fastify";

/**
 * The URL namespace of every route module of the shared surface.
 *
 * This is the one place that says which namespace each module serves. The
 * modules do not read it: a route module declares its routes relative to
 * whatever namespace the mounting application registers it under, and the
 * application names the namespace here.
 */
export const ROUTE_MODULE_PREFIXES = {
	audio: "/audio",
	"character-ai": "/character_ai",
	instagram: "/instagram",
	mtxx: "/mtxx",
	pixverse: "/pixverse",
	remini: "/remini",
	tiktok: "/tiktok",
} as const;

/**
 * The name of a route module of the shared surface.
 */
export type RouteModuleName = keyof typeof ROUTE_MODULE_PREFIXES;

/**
 * Port for storing generated audio outside the request/response cycle.
 *
 * The route module never talks to an object store itself: an app that
 * wants to hand out URLs provides an adapter, an app that returns the payload
 * inline leaves the port out. This keeps the storage vendor (S3, R2, ...) an
 * adapter decision of the app, not of the route module.
 */
export interface AudioStoragePort {
	/**
	 * Stores base64 encoded audio and returns the URL it can be fetched from.
	 *
	 * @param request - The request the audio was produced for.
	 * @param base64Audio - The base64 encoded audio payload.
	 * @returns The URL of the stored audio.
	 */
	uploadBase64Audio(
		request: FastifyRequest,
		base64Audio: string
	): Promise<string>;
}
