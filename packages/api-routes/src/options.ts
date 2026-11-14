import type { FastifyRequest } from "fastify";

/**
 * Port for storing generated audio outside the request/response cycle.
 *
 * The shared route module never talks to an object store itself: an app that
 * wants to hand out URLs provides an adapter, an app that returns the payload
 * inline opts out. This keeps the storage vendor (S3, R2, ...) an adapter
 * decision of the app, not of the shared route.
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
 * Every route of the shared surface, keyed by the route it belongs to.
 *
 * A route that defines more than one endpoint (`/text_to_speech` and
 * `/text_to_speech/with_timestamp`) gets one key per endpoint.
 */
export const SHARED_ROUTE_KEYS = [
	"createIvcVoice",
	"getModels",
	"getVoices",
	"musicCompose",
	"musicComposePlan",
	"speechToSpeech",
	"textToDialogue",
	"textToSpeech",
	"textToSpeechWithTiming",
	"getMedia",
	"clothesSegmentation",
	"expressionGeneration",
	"imageRestoration",
	"outpainting",
	"removeBg",
	"versatileHairstyle",
	"createTask",
	"getContent",
] as const;

/**
 * The key of a route of the shared surface.
 */
export type SharedRouteKey = (typeof SHARED_ROUTE_KEYS)[number];

/**
 * OpenAPI description overrides, per route.
 *
 * The shared module carries the canonical description of every route. An app
 * documents a route differently - the public API publishes examples, the
 * internal API does not - by overriding the description here.
 */
export type SharedRouteDescriptions = Partial<Record<SharedRouteKey, string>>;

/**
 * `consumes` (OpenAPI request content types) overrides, per route.
 */
export type SharedRouteConsumes = Partial<Record<SharedRouteKey, string[]>>;

/**
 * Options the mounting app hands to the shared route surface.
 */
export type SharedRoutesOptions = AudioStorageOptions & {
	/**
	 * Whether the `response-audio-format` request header is declared on the
	 * audio routes.
	 *
	 * Declaring the header documents it in OpenAPI and makes Fastify validate
	 * the incoming header value. An app that does not declare it must not
	 * have the key present in the route schema at all.
	 */
	declareAudioResponseHeader: boolean;

	/**
	 * OpenAPI description overrides, per route.
	 */
	descriptions?: SharedRouteDescriptions;

	/**
	 * `consumes` overrides, per route.
	 */
	consumes?: SharedRouteConsumes;
};
