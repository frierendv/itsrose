import type {
	BetterAuthOptions,
	DBAdapter,
	GenericEndpointContext,
	SecondaryStorage,
} from "better-auth";

/**
 * Options-erased view of a Better Auth database adapter.
 *
 * `DBAdapter<Options>` is invariant in `Options`: the type parameter leaks
 * into `transaction`, `createSchema` and `options`, so an adapter built from a
 * concrete auth options type (`DBAdapter<ConcreteOptions>`) cannot be
 * assigned to `DBAdapter<BetterAuthOptions>`. The billing layer only uses the
 * options-independent CRUD surface, so those three members are dropped here
 * and the remaining surface is shared by every adapter.
 */
export type DatabaseAdapter = Omit<
	DBAdapter<BetterAuthOptions>,
	"transaction" | "createSchema" | "options"
>;

/**
 * Minimal persistence context accepted by the repository factory. This lets
 * callers pass either a Better Auth endpoint context or a bare
 * `AuthContext`/`auth.$context` object.
 */
export interface BillingPersistenceSource {
	adapter: DatabaseAdapter;
	secondaryStorage?: SecondaryStorage | null;
}

/**
 * Secondary storage (Redis/KV) attached to the Better Auth context.
 */
export function getStorageInstance(
	ctx: GenericEndpointContext
): SecondaryStorage | null {
	return ctx.context.secondaryStorage || null;
}

/**
 * Resolves secondary storage from an endpoint context or a bare auth context.
 */
export function resolveStorageInstance(
	source: GenericEndpointContext | BillingPersistenceSource
): SecondaryStorage | null {
	const endpoint = source as Partial<GenericEndpointContext>;
	const bare = source as BillingPersistenceSource;

	return endpoint.context?.secondaryStorage ?? bare.secondaryStorage ?? null;
}

/**
 * Database adapter attached to the Better Auth context.
 */
export function getDbAdapterInstance<
	Options extends BetterAuthOptions = BetterAuthOptions,
>(ctx: GenericEndpointContext): DBAdapter<Options> {
	return ctx.context.adapter;
}

/**
 * Resolves the DB adapter from an endpoint context or a bare auth context.
 */
export function resolveDatabaseAdapter(
	source: GenericEndpointContext | BillingPersistenceSource
): DatabaseAdapter {
	const endpoint = source as Partial<GenericEndpointContext>;
	const bare = source as BillingPersistenceSource;

	return endpoint.context?.adapter ?? bare.adapter;
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
