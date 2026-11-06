/**
 * Environment keys consumed by this package.
 */
export const TIKTOK_ENV = {
	baseUrl: "TIKTOK_TIKWM_BASE_URL",
	apiKey: "TIKTOK_TIKWM_APIKEY",
} as const;

export const TIKTOK_ENV_KEYS = [TIKTOK_ENV.baseUrl, TIKTOK_ENV.apiKey] as const;
