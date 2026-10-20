import { getEnv, type ResolvedEnvValue } from "@itsrose/system";

export const SHARED_ENV_KEYS = [
	// Database
	"DB_NAME",
	"DB_USER",
	"DB_PASS",
	"DB_HOST",
	"DB_PORT",
	"DB_SSL",
	// Redis
	"REDIS_URL",

	// Better-Auth server
	"BETTER_AUTH_API_KEY",
	"BETTER_AUTH_BASE_URL",
	"BETTER_AUTH_SECRET",

	// Client / Application
	"APP_NAME",
	"APP_DOMAIN",
	"APP_BASE_URL",

	// OAuth Providers
	"BETTER_AUTH_GOOGLE_ID",
	"BETTER_AUTH_GOOGLE_SECRET",
	"BETTER_AUTH_GITHUB_ID",
	"BETTER_AUTH_GITHUB_SECRET",
] as const;

export type SharedEnvKey = typeof SHARED_ENV_KEYS;

export type SharedEnv<T extends readonly string[] = SharedEnvKey> = {
	[K in T[number]]: ResolvedEnvValue<{ allowEmpty: true }>;
} & NodeJS.ProcessEnv;

/**
 * Reads specified environment variables using @itsrose/system.
 */
export function readEnvs<T extends readonly string[]>(keys: T): SharedEnv<T> {
	const env = {} as SharedEnv<T>;
	for (const envKey of keys) {
		Object.assign(env, { [envKey]: getEnv(envKey, { allowEmpty: true }) });
	}
	return env;
}
