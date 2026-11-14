import {
	ROUTE_MODULE_PREFIXES,
	type AudioStorageOptions,
	type RouteModuleOptions,
} from "../options";

/**
 * Every route of the audio surface, keyed by the route it belongs to.
 *
 * A route that defines more than one endpoint (`/text_to_speech` and
 * `/text_to_speech/with_timestamp`) gets one key per endpoint.
 */
export const AUDIO_ROUTE_KEYS = [
	"createIvcVoice",
	"getModels",
	"getVoices",
	"musicCompose",
	"musicComposePlan",
	"speechToSpeech",
	"textToDialogue",
	"textToSpeech",
	"textToSpeechWithTiming",
] as const;

/**
 * The key of a route of the audio surface.
 */
export type AudioRouteKey = (typeof AUDIO_ROUTE_KEYS)[number];

/**
 * The default URL namespace of the audio routes.
 */
export const AUDIO_ROUTE_PREFIX = ROUTE_MODULE_PREFIXES["audio"];

/**
 * The options the audio route module is registered with.
 */
export type AudioRoutesOptions = RouteModuleOptions<AudioRouteKey> &
	AudioStorageOptions & {
		/**
		 * Whether the `response-audio-format` request header is declared on the
		 * audio routes.
		 *
		 * Declaring the header documents it in OpenAPI and makes Fastify validate
		 * the incoming header value. An app that does not declare it must not
		 * have the key present in the route schema at all.
		 */
		declareAudioResponseHeader: boolean;
	};
