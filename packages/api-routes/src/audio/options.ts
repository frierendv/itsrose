import { ELEVENLABS_ENV, ELEVENLABS_ENV_KEYS } from "@itsrose/elevenlabs/env";
import type { FastifyRequest } from "fastify";
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
	"deleteVoice",
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
 * A voice an upstream create just produced, ready to be recorded against the
 * caller that asked for it.
 */
export type ClonedVoice = {
	/** The upstream id of the created voice. */
	voice_id: string;
	/** The name the caller asked the provider to give it. */
	name: string;
};

/**
 * Port that enforces voice ownership on the audio surface.
 *
 * The route module is stateless by decision: it cannot read the owner ledger
 * itself. An application that wants the public surface restricted supplies
 * this port; the routes then list only the caller's clones plus premade
 * voices, refuse a voice the caller neither owns nor may use, record a clone
 * against its owner after the upstream create, and delete only an owned voice.
 *
 * Omitted, the module keeps its pre-ownership behaviour - the internal app has
 * no owner ledger and mounts the same module without a port.
 */
export interface VoiceAccessPort {
	/** The upstream ids of the voices the caller owns. */
	listOwnedVoiceIds(request: FastifyRequest): Promise<string[]>;

	/**
	 * Resolves when the caller may use the voice.
	 *
	 * @throws {VoiceAccessDeniedError} When the voice is neither owned nor
	 * premade.
	 */
	assertCanUseVoice(request: FastifyRequest, voiceId: string): Promise<void>;

	/** Records a freshly created upstream clone against the caller. */
	recordClonedVoice(
		request: FastifyRequest,
		voice: ClonedVoice
	): Promise<void>;

	/** Deletes an owned voice, upstream first, then its ledger row. */
	deleteOwnedVoice(request: FastifyRequest, voiceId: string): Promise<void>;
}

/**
 * Thrown when the caller asks for a voice it neither owns nor may use.
 *
 * The error names the voice the caller supplied, never an owner and never
 * whether the voice exists at all: a foreign voice and an unknown one raise
 * the same error, so the route is not an existence oracle.
 */
export class VoiceAccessDeniedError extends Error {
	/** The voice id the caller asked for. */
	readonly voiceId: string;

	/**
	 * @param voiceId The voice id the caller asked for.
	 */
	constructor(voiceId: string) {
		super(`The voice "${voiceId}" is not available to the caller.`);
		this.name = "VoiceAccessDeniedError";
		this.voiceId = voiceId;
	}
}

/**
 * Thrown when a route that needs the ownership port runs without one.
 *
 * The host's error mapper turns this into a deployment error: the route is
 * registered but this application never composed a voice ledger.
 */
export class VoiceAccessUnavailableError extends Error {
	/**
	 * @param message The reason voice ownership is unavailable.
	 */
	constructor(
		message = "Voice ownership enforcement is not configured on this deployment."
	) {
		super(message);
		this.name = "VoiceAccessUnavailableError";
	}
}

/**
 * The options the audio route module is registered with.
 *
 * The audio routes are the only module with host-injected capabilities: they
 * may declare the audio format header, may hand the generated audio to the
 * host's storage port and may enforce voice ownership through the host's
 * ledger.
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

	/**
	 * Enforces voice ownership on the audio surface.
	 *
	 * Omitted, the routes keep their pre-ownership behaviour: every upstream
	 * voice is listed, used and cloned as this module always did. The internal
	 * app mounts the module this way; the public app supplies the port over
	 * its voice ledger.
	 */
	voiceAccess?: VoiceAccessPort;
};
