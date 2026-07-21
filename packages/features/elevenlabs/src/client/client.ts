import { createHttpClient } from "@itsrose/http-client";
import { getEnv } from "@itsrose/system";

/**
 * Http client for ElevenLabs API.
 */
export const httpClient = createHttpClient({
	baseURL: "https://api.elevenlabs.io",
	headers: {
		"xi-api-key": getEnv("ELEVENLABS_API_KEY", { isRequired: true }),
	},
});
