import { SystemError } from "@itsrose/system";
import { ENVS, PACKAGE_ENV, PACKAGE_ENV_KEYS } from "./env";

type EnvRecord = Record<string, string | undefined>;

export type EnvProblem = { key: string; message: string };

export type EnvValidation = {
	/** Required to boot; missing values are fatal. */
	missing: string[];
	/** Present but malformed. */
	invalid: EnvProblem[];
	/** Optional integrations that are partially configured. */
	warnings: string[];
};

/**
 * Variables that must be present for `fastify.ready()` to complete.
 *
 * Route autoload imports every feature client, and the auth plugin constructs
 * the payment and storage clients eagerly, so these cannot be deferred.
 */
export const BOOT_REQUIRED_KEYS = [
	"DB_NAME",
	"DB_USER",
	"DB_PASS",
	"DB_HOST",
	"DB_PORT",
	"REDIS_URL",
	"BETTER_AUTH_SECRET",
	PACKAGE_ENV.midtrans.serverKey,
	"S3_ACCOUNT_ID",
	"S3_ACCESS_KEY",
	"S3_SECRET_KEY",
	"S3_BUCKET",
	...PACKAGE_ENV_KEYS.elevenlabs,
	...PACKAGE_ENV_KEYS.tiktok,
	PACKAGE_ENV.mtxx.sdkBaseUrl,
	PACKAGE_ENV.mtxx.openapiBaseUrl,
	PACKAGE_ENV.mtxx.key,
	PACKAGE_ENV.mtxx.secret,
	...PACKAGE_ENV_KEYS.characterAi,
] as const;

const URL_KEYS = [
	"APP_BASE_URL",
	"BETTER_AUTH_BASE_URL",
	PACKAGE_ENV.tiktok.baseUrl,
	PACKAGE_ENV.mtxx.sdkBaseUrl,
	PACKAGE_ENV.mtxx.openapiBaseUrl,
	PACKAGE_ENV.characterAi.neoBaseUrl,
	PACKAGE_ENV.remini.apiBaseUrl,
] as const;

function isPresent(env: EnvRecord, key: string): boolean {
	const value = env[key];
	return value !== undefined && value !== "";
}

function isUrl(value: string): boolean {
	try {
		new URL(value);
		return true;
	} catch {
		return false;
	}
}

/**
 * Validates the process environment without throwing; used by tests and by the
 * boot-time assertion below.
 */
export function validateApiEnv(env: EnvRecord = process.env): EnvValidation {
	const missing = BOOT_REQUIRED_KEYS.filter((key) => !isPresent(env, key));
	const invalid: EnvProblem[] = [];
	const warnings: string[] = [];

	for (const key of ["DB_PORT"] as const) {
		const value = env[key];
		if (value && (!Number.isInteger(Number(value)) || Number(value) <= 0)) {
			invalid.push({ key, message: "must be a positive integer" });
		}
	}

	const redisUrl = env.REDIS_URL;
	if (
		redisUrl &&
		!redisUrl.startsWith("redis://") &&
		!redisUrl.startsWith("rediss://")
	) {
		invalid.push({
			key: "REDIS_URL",
			message: "must start with redis:// or rediss://",
		});
	}

	for (const key of URL_KEYS) {
		const value = env[key];
		if (value && !isUrl(value)) {
			invalid.push({ key, message: "must be a valid URL" });
		}
	}

	const quotaMode = env.USAGE_QUOTA_ENFORCEMENT;
	if (quotaMode && quotaMode !== "soft" && quotaMode !== "hard") {
		invalid.push({
			key: "USAGE_QUOTA_ENFORCEMENT",
			message: "must be 'soft' or 'hard'",
		});
	}

	const flushInterval = env.USAGE_FLUSH_INTERVAL_SECONDS;
	if (
		flushInterval &&
		(!Number.isFinite(Number(flushInterval)) || Number(flushInterval) < 0)
	) {
		invalid.push({
			key: "USAGE_FLUSH_INTERVAL_SECONDS",
			message: "must be a non-negative number",
		});
	}

	const googleId = env.BETTER_AUTH_GOOGLE_ID ?? env.BETTER_GOOGLE_CLIENT_ID;
	const googleSecret =
		env.BETTER_AUTH_GOOGLE_SECRET ?? env.BETTER_GOOGLE_CLIENT_SECRET;
	if (Boolean(googleId) !== Boolean(googleSecret)) {
		warnings.push(
			"Google OAuth is partially configured: set both the client id and secret or neither."
		);
	}

	const githubId = env.BETTER_AUTH_GITHUB_ID;
	const githubSecret = env.BETTER_AUTH_GITHUB_SECRET;
	if (Boolean(githubId) !== Boolean(githubSecret)) {
		warnings.push(
			"GitHub OAuth is partially configured: set both the client id and secret or neither."
		);
	}

	if (
		env[PACKAGE_ENV.mailer.apiKey] &&
		!env[PACKAGE_ENV.mailer.from] &&
		!env.APP_DOMAIN
	) {
		warnings.push(
			"Mailer has an API key but no sender: set EUSEND_FROM or APP_DOMAIN."
		);
	}

	if (!env[PACKAGE_ENV.billing.cronSecret]) {
		warnings.push(
			"BILLING_CRON_SECRET is unset: the billing cron endpoint then requires an admin session."
		);
	}

	if (
		!env[PACKAGE_ENV.remini.apiBaseUrl] ||
		!env[PACKAGE_ENV.remini.wssBaseUrl]
	) {
		warnings.push(
			"Remini endpoints are not configured; those routes will fail on first call."
		);
	}

	return { missing, invalid, warnings };
}

/** Formats the validation result as one actionable message. */
export function formatEnvProblems(validation: EnvValidation): string {
	const lines = [
		`Invalid environment configuration: ${validation.missing.length} missing, ${validation.invalid.length} invalid.`,
	];
	if (validation.missing.length > 0) {
		lines.push(`  missing: ${validation.missing.join(", ")}`);
	}
	for (const problem of validation.invalid) {
		lines.push(`  invalid ${problem.key}: ${problem.message}`);
	}
	if (validation.warnings.length > 0) {
		lines.push("Warnings:");
		for (const warning of validation.warnings) {
			lines.push(`  - ${warning}`);
		}
	}
	lines.push("See apps/api/.env.example for the full list.");
	return lines.join("\n");
}

/**
 * Fails fast with every problem in one message instead of the first missing
 * variable thrown from a module initializer.
 */
export function assertApiEnv(env: EnvRecord = process.env): EnvValidation {
	const validation = validateApiEnv(env);
	if (validation.missing.length > 0 || validation.invalid.length > 0) {
		throw new SystemError(formatEnvProblems(validation));
	}
	return validation;
}

/** Keys the allowlist is expected to cover; used by tests. */
export const ALLOWLISTED_ENV_KEYS = ENVS;
