/**
 * Environment keys consumed by this package.
 */
export const CHARACTER_AI_ENV = {
	userToken: "CAI_USER_TOKEN",
	neoBaseUrl: "CAI_NEO_BASE_URL",
} as const;

export const CHARACTER_AI_ENV_KEYS = [
	CHARACTER_AI_ENV.userToken,
	CHARACTER_AI_ENV.neoBaseUrl,
] as const;
