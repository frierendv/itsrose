import { getEnv } from "@itsrose/system";

/**
 * Base URL for the TikWM TikTok downloader service.
 */
export const TIKTOK_TIKWM_BASE_URL = getEnv("TIKTOK_TIKWM_BASE_URL", {
	isRequired: true,
});

/**
 * API key for authenticating with the TikWM service.
 */
export const TIKWM_APIKEY = getEnv("TIKTOK_TIKWM_APIKEY", { isRequired: true });
