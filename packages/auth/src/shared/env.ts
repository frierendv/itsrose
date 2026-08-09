import { getEnv, type ResolvedEnvValue } from "@itsrose/system";

export const SHARED_ENV_KEYS = [
	// database
	"DB_NAME",
	"DB_USER",
	"DB_PASS",
	"DB_HOST",
	"DB_PORT",
	"DB_SSL",
	// redis
	"REDIS_URL",

	// better-auth auth server
	"BETTER_AUTH_API_KEY",
	"BETTER_AUTH_BASE_URL",
	"BETTER_AUTH_SECRET",

	// client (passkeys, ..etc)
	"APP_NAME",
	"APP_DOMAIN",
	"APP_BASE_URL",

	// Oauth
	// google
	"BETTER_AUTH_GOOGLE_ID",
	"BETTER_AUTH_GOOGLE_SECRET",
	// github
	"BETTER_AUTH_GITHUB_ID",
	"BETTER_AUTH_GITHUB_SECRET",
] as const;

export type SharedEnvKey = typeof SHARED_ENV_KEYS;
export type SharedEnv<T extends readonly string[] = SharedEnvKey> = {
	[K in T[number]]: ResolvedEnvValue<{ allowEmpty: true }>;
};

export function readEnvs<T extends readonly string[]>(keys: T) {
	const env: SharedEnv<T> = {} as any;
	for (const envKey of keys) {
		Object.assign(env, { [envKey]: getEnv(envKey, { allowEmpty: true }) });
	}
	return env;
}
