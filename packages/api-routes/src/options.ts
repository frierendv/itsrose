import type { FastifyRequest } from "fastify";

/**
 * The default URL namespace of every route module of the shared surface.
 *
 * This is the one place that says which namespace each module serves: a
 * module reads its own prefix from here, and an application that wants to
 * know where a module lives looks it up here.
 */
export const ROUTE_MODULE_PREFIXES = {
	audio: "/audio",
	"character-ai": "/character_ai",
	instagram: "/instagram",
	mtxx: "/mtxx",
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
 * inline opts out. This keeps the storage vendor (S3, R2, ...) an adapter
 * decision of the app, not of the route module.
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

/**
 * Whether generated audio is uploaded to object storage before it is returned.
 *
 * Modelled as a discriminated union so an app cannot ask for uploads without
 * providing the port that performs them.
 */
export type AudioStorageOptions =
	| { uploadAudioToStorage: false; audioStorage?: never }
	| { uploadAudioToStorage: true; audioStorage: AudioStoragePort };

/**
 * The options every route module understands.
 *
 * The keys of `descriptions` and `consumes` are the routes of the module the
 * options belong to, so an app cannot document a route of another package by
 * mistake.
 *
 * @typeParam TKey - The route keys of the module.
 */
export type RouteModuleOptions<TKey extends string> = {
	/**
	 * The URL namespace the routes of the module live in.
	 *
	 * Left out, the module uses its own default - the name of the package
	 * the routes belong to. An empty string mounts the module at the root of
	 * the application.
	 */
	prefix?: string;

	/**
	 * OpenAPI description overrides, per route of the module.
	 */
	descriptions?: Partial<Record<TKey, string>>;

	/**
	 * `consumes` (OpenAPI request content types) overrides, per route of the
	 * module.
	 */
	consumes?: Partial<Record<TKey, string[]>>;
};
