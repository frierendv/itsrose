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

	// ROOT App domain, used for cross sub domain
	"ROOT_DOMAIN",

	// Client / Application
	"APP_NAME",
	"APP_DOMAIN",
	"APP_BASE_URL",

	// OAuth Providers
	"BETTER_AUTH_GOOGLE_ID",
	"BETTER_AUTH_GOOGLE_SECRET",
	/** Legacy aliases for the same Google OAuth client. */
	"BETTER_GOOGLE_CLIENT_ID",
	"BETTER_GOOGLE_CLIENT_SECRET",
	"BETTER_AUTH_GITHUB_ID",
	"BETTER_AUTH_GITHUB_SECRET",

	// S3 Storage
	"S3_ACCOUNT_ID",
	"S3_ACCESS_KEY",
	"S3_SECRET_KEY",
	"S3_BUCKET",
	"S3_PUBLIC_DOMAIN",
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

/** Canonical and legacy names for the Google OAuth client. */
export const GOOGLE_OAUTH_ENV_KEYS = [
	"BETTER_AUTH_GOOGLE_ID",
	"BETTER_AUTH_GOOGLE_SECRET",
	"BETTER_GOOGLE_CLIENT_ID",
	"BETTER_GOOGLE_CLIENT_SECRET",
] as const;

export type GoogleOAuthCredentials = {
	clientId?: string;
	clientSecret?: string;
};

/**
 * Resolves the Google OAuth client from the canonical names, falling back to
 * the legacy `BETTER_GOOGLE_*` aliases so existing deployments keep working.
 */
export function resolveGoogleOAuthCredentials(
	env: Record<string, string | undefined>
): GoogleOAuthCredentials {
	const clientId = env.BETTER_AUTH_GOOGLE_ID || env.BETTER_GOOGLE_CLIENT_ID;
	const clientSecret =
		env.BETTER_AUTH_GOOGLE_SECRET || env.BETTER_GOOGLE_CLIENT_SECRET;
	return {
		clientId: clientId || undefined,
		clientSecret: clientSecret || undefined,
	};
}
