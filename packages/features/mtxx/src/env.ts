/**
 * Environment keys consumed by this package.
 */
export const MTXX_ENV = {
	appVersion: "MTXX_APP_VERSION",
	sdkBaseUrl: "MTXX_SDK_BASE_URL",
	openapiBaseUrl: "MTXX_OPENAPI_BASE_URL",
	key: "MTXX_KEY",
	secret: "MTXX_SECRET",
} as const;

export const MTXX_ENV_KEYS = [
	MTXX_ENV.appVersion,
	MTXX_ENV.sdkBaseUrl,
	MTXX_ENV.openapiBaseUrl,
	MTXX_ENV.key,
	MTXX_ENV.secret,
] as const;
