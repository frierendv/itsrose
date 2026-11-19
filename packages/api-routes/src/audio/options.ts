import { ELEVENLABS_ENV, ELEVENLABS_ENV_KEYS } from "@itsrose/elevenlabs/env";
import { ROUTE_MODULE_PREFIXES, type AudioStoragePort } from "../options";

/**
 * A environment variable needed by this route.
 */
export { ELEVENLABS_ENV, ELEVENLABS_ENV_KEYS as AUDIO_ENV_KEYS };
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
 * The URL namespace of the audio routes.
 *
 * The module itself does not read it: the mounting application registers the
 * module under this prefix.
 */
export const AUDIO_ROUTE_PREFIX = ROUTE_MODULE_PREFIXES["audio"];

/**
 * The options the audio route module is registered with.
 *
 * The audio routes are the only module with host-injected capabilities: they
 * may declare the audio format header and may hand the generated audio to the
 * host's storage port.
 */
export type AudioRoutesOptions = {
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
	 * Stores generated audio and returns the URL it can be fetched from.
	 *
	 * Omitted, the routes return the payload inline - the internal API and
	 * the tests do not need object storage.
	 */
	audioStorage?: AudioStoragePort;
};
