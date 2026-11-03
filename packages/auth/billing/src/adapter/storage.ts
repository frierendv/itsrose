import type {
	BetterAuthOptions,
	DBAdapter,
	GenericEndpointContext,
	SecondaryStorage,
} from "better-auth";

/**
 * Secondary storage (Redis/KV) attached to the Better Auth context.
 */
export function getStorageInstance(
	ctx: GenericEndpointContext
): SecondaryStorage | null {
	return ctx.context.secondaryStorage || null;
}

/**
 * Database adapter attached to the Better Auth context.
 */
export function getDbAdapterInstance<
	Options extends BetterAuthOptions = BetterAuthOptions,
>(ctx: GenericEndpointContext): DBAdapter<Options> {
	return ctx.context.adapter;
}

/** @internal */
export function serialize<T>(value: T): string {
	if (typeof value !== "object" || value === null) {
		return "null";
	}
	return JSON.stringify(value);
}

/** @internal */
export function deserialize<T>(data: unknown): T | null {
	if (!data || typeof data !== "string" || data === "null") {
		return null;
	}
	try {
		return JSON.parse(data) as T;
	} catch {
		return null;
	}
}

/** @internal */
export type CacheHit<T> = { hit: true; value: T | null } | { hit: false };

/**
 * Reads a JSON cache entry while preserving the difference between a cache
 * miss and a cached `null` (used for "user has no subscription" entries).
 */
export async function getCachedValue<T>(
	storage: SecondaryStorage | null,
	key: string
): Promise<CacheHit<T>> {
	if (!storage) {
		return { hit: false };
	}

	try {
		const raw = await storage.get(key);
		if (raw === null || raw === undefined) {
			return { hit: false };
		}
		return { hit: true, value: deserialize<T>(raw) };
	} catch {
		return { hit: false };
	}
}

/** @internal */
export async function setCachedValue<T>(
	storage: SecondaryStorage | null,
	key: string,
	value: T,
	ttlSeconds?: number
): Promise<void> {
	if (!storage) {
		return;
	}

	try {
		if (value === null || value === undefined) {
			await storage.set(key, "null", ttlSeconds ?? 60);
			return;
		}
		await storage.set(key, serialize(value), ttlSeconds);
	} catch {
		// Cache writes are best-effort.
	}
}

/** @internal */
export async function deleteCachedValue(
	storage: SecondaryStorage | null,
	key: string
): Promise<void> {
	if (!storage) {
		return;
	}

	try {
		await storage.delete(key);
	} catch {
		// Cache deletes are best-effort.
	}
}
