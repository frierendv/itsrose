import { getEnv } from "@itsrose/system";

export const MUTABLE_CACHE_CONTROL = "public, max-age=3600, must-revalidate";
export const EPHEMERAL_CACHE_CONTROL = "public, max-age=86400, s-maxage=86400";

export interface StorageConfig {
	accessKeyId?: string;
	secretAccessKey?: string;
	endpoint?: string;
	region?: string;
	bucket?: string;
	/**
	 * Cloudflare R2 custom domain or public CDN domain (e.g. `https://pub-cdn.itsrose.net`).
	 */
	customDomain?: string;
	/**
	 * Alias for {@link customDomain}.
	 */
	publicDomain?: string;
}

/**
 * Resolves user ephemeral storage configuration from environment or provided overrides.
 */
export function resolveStorageConfig(
	overrides: Partial<StorageConfig> = {}
): StorageConfig {
	const accessKeyId =
		overrides.accessKeyId ?? getEnv("S3_ACCESS_KEY", { allowEmpty: true });

	const secretAccessKey =
		overrides.secretAccessKey ??
		getEnv("S3_SECRET_KEY", { allowEmpty: true });

	const endpoint =
		overrides.endpoint ?? getEnv("S3_ENDPOINT", { allowEmpty: true });

	const bucket =
		overrides.bucket ?? getEnv("S3_BUCKET", { allowEmpty: true });

	const customDomain =
		overrides.customDomain ??
		overrides.publicDomain ??
		getEnv("S3_CUSTOM_DOMAIN", { allowEmpty: true }) ??
		getEnv("S3_PUBLIC_DOMAIN", { allowEmpty: true });

	const region =
		overrides.region ?? getEnv("S3_REGION", { allowEmpty: true }) ?? "auto";

	return {
		accessKeyId: accessKeyId || undefined,
		secretAccessKey: secretAccessKey || undefined,
		endpoint: endpoint || undefined,
		bucket: bucket || undefined,
		customDomain: customDomain || undefined,
		publicDomain: customDomain || undefined,
		region: region || "auto",
	};
}
