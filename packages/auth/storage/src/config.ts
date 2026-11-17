import { getEnv } from "@itsrose/system";
import { STORAGE_ENV as ENV } from "./env";

export const MUTABLE_CACHE_CONTROL = "public, max-age=3600, must-revalidate";
export const EPHEMERAL_CACHE_CONTROL = "public, max-age=86400, s-maxage=86400";

export interface StorageConfig {
	/**
	 * Cloudflare account ID used to construct the R2 endpoint.
	 */
	accountId?: string;
	accessKeyId?: string;
	secretAccessKey?: string;
	bucket?: string;
	/**
	 * Cloudflare R2 custom domain or public CDN domain (e.g. `https://pub-cdn.itsrose.net`).
	 */
	publicDomain?: string;
}

/**
 * Resolves user ephemeral storage configuration from environment or provided overrides.
 */
export function resolveStorageConfig(
	overrides: Partial<StorageConfig> = {}
): StorageConfig {
	const accountId =
		overrides.accountId ?? getEnv(ENV.accountId, { allowEmpty: true });

	const accessKeyId =
		overrides.accessKeyId ?? getEnv(ENV.accessKeyId, { allowEmpty: true });

	const secretAccessKey =
		overrides.secretAccessKey ??
		getEnv(ENV.secretAccessKey, { allowEmpty: true });

	const bucket = overrides.bucket ?? getEnv(ENV.bucket, { allowEmpty: true });

	const publicDomain =
		overrides.publicDomain ??
		getEnv(ENV.publicDomain, { allowEmpty: true });

	return {
		accountId: accountId || undefined,
		accessKeyId: accessKeyId || undefined,
		secretAccessKey: secretAccessKey || undefined,
		bucket: bucket || undefined,
		publicDomain: publicDomain || undefined,
	};
}
