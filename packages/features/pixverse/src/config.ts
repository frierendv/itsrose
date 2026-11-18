import { getEnv } from "@itsrose/system";
import { PIXVERSE_ENV } from "./env";

/**
 * The production base URL of the PixVerse platform API.
 */
export const PIXVERSE_PRODUCTION_BASE_URL = "https://app-api.pixverse.ai";

/**
 * Base URL of the PixVerse platform API.
 */
export const PIXVERSE_BASE_URL = getEnv(PIXVERSE_ENV.baseUrl, {
	defaultValue: PIXVERSE_PRODUCTION_BASE_URL,
});

/**
 * API key used to authenticate with the PixVerse platform API.
 */
export const PIXVERSE_API_KEY = getEnv(PIXVERSE_ENV.apiKey, {
	isRequired: true,
});
