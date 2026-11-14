import { getEnv } from "@itsrose/system";
import { createUpstreamClient } from "@itsrose/upstream-client";
import { ELEVENLABS_ENV } from "../env";
import { mapElevenLabsError } from "./error";

/**
 * Origin of the ElevenLabs API.
 */
export const ELEVENLABS_BASE_URL = "https://api.elevenlabs.io";

/**
 * Options of {@linkcode createElevenLabsClient}.
 */
export interface ElevenLabsClientOptions {
	/**
	 * Origin of the API. Defaults to the ElevenLabs origin.
	 */
	baseURL?: string;

	/**
	 * API key the calls authenticate with. Defaults to the configured one.
	 */
	apiKey?: string;
}

/**
 * Creates the client the package reaches the ElevenLabs API through.
 *
 * @param options The origin and the key the calls are made with.
 * @returns The client.
 */
export const createElevenLabsClient = (options: ElevenLabsClientOptions = {}) =>
	createUpstreamClient({
		service: "elevenlabs",
		baseURL: options.baseURL ?? ELEVENLABS_BASE_URL,
		headers: {
			"xi-api-key":
				options.apiKey ??
				getEnv(ELEVENLABS_ENV.apiKey, { isRequired: true }),
		},
		mapError: mapElevenLabsError,
	});

/**
 * The client the package calls the ElevenLabs API with.
 */
export const httpClient = createElevenLabsClient();

/**
 * The client the package downloads audio assets with.
 *
 * Audio assets live on other hosts, so this client carries no origin and no
 * credentials: an asset request must not leak the API key to a CDN.
 */
export const assetClient = createUpstreamClient({
	service: "elevenlabs-assets",
});
