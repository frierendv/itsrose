import { getEnv } from "@itsrose/system";
import { TIKTOK_ENV } from "./env";

/**
 * Base URL for the TikWM TikTok downloader service.
 */
export const TIKTOK_TIKWM_BASE_URL = getEnv(TIKTOK_ENV.baseUrl, {
	isRequired: true,
});

/**
 * API key for authenticating with the TikWM service.
 */
export const TIKWM_APIKEY = getEnv(TIKTOK_ENV.apiKey, { isRequired: true });
