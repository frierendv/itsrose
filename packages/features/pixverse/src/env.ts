/**
 * Environment keys consumed by this package.
 */
export const PIXVERSE_ENV = {
	baseUrl: "PIXVERSE_BASE_URL",
	apiKey: "PIXVERSE_API_KEY",
} as const;

export const PIXVERSE_ENV_KEYS = [
	PIXVERSE_ENV.baseUrl,
	PIXVERSE_ENV.apiKey,
] as const;
