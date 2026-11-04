import { StorageClient } from "@itsrose/s3";
import { resolveStorageConfig, type StorageConfig } from "./config";

let cachedStorageClient: StorageClient | null = null;
let lastConfigHash = "";

function hashConfig(config: StorageConfig): string {
	return `${config.accountId ?? ""}:${config.accessKeyId ?? ""}:${config.bucket ?? ""}:${config.publicDomain ?? ""}`;
}

/**
 * Resolves or creates a singleton storage client instance bound to the ephemeral storage configuration.
 */
export function getStorageClient(
	overrides: Partial<StorageConfig> = {}
): StorageClient {
	const resolved = resolveStorageConfig(overrides);
	const hash = hashConfig(resolved);

	if (!cachedStorageClient || lastConfigHash !== hash) {
		cachedStorageClient = new StorageClient({
			accountId: resolved.accountId ?? "",
			accessKeyId: resolved.accessKeyId ?? "",
			secretAccessKey: resolved.secretAccessKey ?? "",
			bucket: resolved.bucket ?? "",
			publicDomain: resolved.publicDomain,
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
