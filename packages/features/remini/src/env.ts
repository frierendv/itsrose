/**
 * Environment keys consumed by this package.
 */
export const REMINI_ENV = {
	apiBaseUrl: "REMINI_API_BASE_URL",
	wssBaseUrl: "REMINI_WSS_BASE_URL",
} as const;

export const REMINI_ENV_KEYS = [
	REMINI_ENV.apiBaseUrl,
	REMINI_ENV.wssBaseUrl,
] as const;
