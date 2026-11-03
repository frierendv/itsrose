import { S3 } from "@itsrose/s3";
import { resolveStorageConfig, type StorageConfig } from "./config";

let cachedStorageClient: S3 | null = null;
let lastConfigHash = "";

function hashConfig(config: StorageConfig): string {
	return `${config.accessKeyId ?? ""}:${config.endpoint ?? ""}:${config.bucket ?? ""}:${config.customDomain ?? config.publicDomain ?? ""}:${config.region ?? ""}`;
}

/**
 * Resolves or creates a singleton S3 client instance bound to the ephemeral storage configuration.
 */
export function getStorageClient(overrides: Partial<StorageConfig> = {}): S3 {
	const resolved = resolveStorageConfig(overrides);
	const hash = hashConfig(resolved);

	if (!cachedStorageClient || lastConfigHash !== hash) {
		cachedStorageClient = new S3({
			accessKeyId: resolved.accessKeyId,
			secretAccessKey: resolved.secretAccessKey,
			endpoint: resolved.endpoint,
			bucket: resolved.bucket,
			bucketName: resolved.bucket,
			customDomain: resolved.customDomain,
			publicDomain: resolved.customDomain ?? resolved.publicDomain,
			region: resolved.region,
			defaultPrefix: "t",
		});
		lastConfigHash = hash;
	}

	return cachedStorageClient;
}

/**
 * Resets the cached storage client. Useful in tests.
 */
export function resetStorageClient(): void {
	cachedStorageClient = null;
	lastConfigHash = "";
}
