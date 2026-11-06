import { createHttpClient } from "@itsrose/http-client";
import { getEnv } from "@itsrose/system";
import { ELEVENLABS_ENV } from "../env";
import { parseElevenLabsError } from "./error";

/**
 * Http client for ElevenLabs API.
 */
export const httpClient = createHttpClient({
	baseURL: "https://api.elevenlabs.io",
	headers: {
		"xi-api-key": getEnv(ELEVENLABS_ENV.apiKey, { isRequired: true }),
	},
	onError: parseElevenLabsError,
});
