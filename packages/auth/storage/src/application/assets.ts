import { buildUserAssetKey } from "../keys";
import { assetPolicyFor, SIGNED_READ_TTL_SECONDS } from "../policy";
import type { AssetKind } from "../policy";
import type {
	AssetListOptions,
	AssetRecord,
	AssetRegistryPort,
} from "../types";

/* -------------------------------------------------------------------------- */
/*                            Entitlements & ports                            */
/* -------------------------------------------------------------------------- */

/**
 * The durable storage allowance resolved for one user.
 *
 * Structural twin of the billing package's `PlanEntitlements`: the shape is
 * repeated rather than imported so storage never depends on billing. `null`
 * means unlimited on both fields.
 */
export type StorageAllowance = {
	/** Durable storage allowance in bytes; `null` means unlimited. */
	storage_bytes: number | null;
	/** Durable asset count allowance; `null` means unlimited. */
	storage_assets: number | null;
};

/** One object to write under the durable `assets/` root. */
export type AssetObjectPutInput = {
	key: string;
	body: Buffer;
	contentType: string;
};

/**
 * Object-storage port for durable assets.
 *
 * Implemented by the host application (or a test fake); the application layer
 * never imports `@itsrose/s3`.
 */
export interface AssetObjectStorePort {
	/** Writes one object; resolving means the bytes are stored. */
	put(input: AssetObjectPutInput): Promise<void>;
	/** Removes one object; resolving means it is gone. */
	remove(key: string): Promise<void>;
	/** Mints a signed GET URL for `key`, valid for `ttlSeconds`. */
	presignGet(key: string, ttlSeconds: number): Promise<string>;
}

/** Resolves the storage allowance a user's plan grants. */
export interface AssetEntitlementPort {
	forUser(userId: string): Promise<StorageAllowance>;
}

/* -------------------------------------------------------------------------- */
/*                                Domain errors                               */
/* -------------------------------------------------------------------------- */

/** Which storage allowance an upload would exceed. */
export type AssetCap = "bytes" | "assets";

/** Thrown when a new upload would push a tenant past its storage allowance. */
export class AssetCapExceededError extends Error {
	/** The allowance that would be exceeded. */
	readonly cap: AssetCap;

	constructor(cap: AssetCap, message: string) {
		super(message);
		this.name = "AssetCapExceededError";
		this.cap = cap;
	}
}

/**
 * Thrown when an asset is missing, soft-deleted, or not owned by the caller.
 *
 * The three cases deliberately share one error: a foreign owner must not be
 * able to tell an existing asset from a nonexistent one.
 */
export class AssetNotFoundError extends Error {
	/** The asset id the caller asked for. */
	readonly assetId: string;

	constructor(assetId: string) {
		super(`Asset "${assetId}" was not found.`);
		this.name = "AssetNotFoundError";
		this.assetId = assetId;
	}
}

/* -------------------------------------------------------------------------- */
/*                                Service shape                               */
/* -------------------------------------------------------------------------- */

export type UploadAssetInput = {
	userId: string;
	tenantId: string;
	/** Requested asset kind; checked against the closed policy table. */
	kind: string;
	filename: string;
	body: Buffer;
	contentType: string;
};

export type ListAssetsInput = AssetListOptions & {
	userId: string;
};

export type ReadAssetUrlInput = {
	userId: string;
	assetId: string;
};

export type RemoveAssetInput = {
	userId: string;
	assetId: string;
};

/** A signed read URL and the number of seconds it stays valid. */
export type AssetReadUrl = {
	url: string;
	expires_in: number;
};

/** The ports and injected non-determinism the service depends on. */
export type AssetServiceDependencies = {
	registry: AssetRegistryPort;
	objects: AssetObjectStorePort;
	entitlements: AssetEntitlementPort;
	/** Injected so `created_at`/`deleted_at` stay deterministic in tests. */
	clock: () => Date;
	/** Injected so the object key and the row share one server-chosen id. */
	newId: () => string;
};

export interface AssetService {
	upload(input: UploadAssetInput): Promise<AssetRecord>;
	list(input: ListAssetsInput): Promise<AssetRecord[]>;
	readUrl(input: ReadAssetUrlInput): Promise<AssetReadUrl>;
	remove(input: RemoveAssetInput): Promise<boolean>;
}

/* -------------------------------------------------------------------------- */
/*                                  Helpers                                   */
/* -------------------------------------------------------------------------- */

/**
 * Narrows a requested kind to the closed `AssetKind` union.
 *
 * `assetPolicyFor` is the single owner of the kind check — it throws the shared
 * `StorageValidationError` — and the assertion only carries that verified
 * result into `buildUserAssetKey`'s type.
 */
function toAssetKind(kind: string): AssetKind {
	assetPolicyFor(kind);
	return kind as AssetKind;
}

/**
 * Reads one row and asserts that the caller owns it and that it is still live.
 */
async function findOwnedAsset(
	registry: AssetRegistryPort,
	userId: string,
	assetId: string
): Promise<AssetRecord> {
	const record = await registry.findById(assetId);

	if (!record || record.deleted_at !== null || record.user_id !== userId) {
		throw new AssetNotFoundError(assetId);
	}

	return record;
}

/* -------------------------------------------------------------------------- */
/*                                  Service                                   */
/* -------------------------------------------------------------------------- */

/**
 * Builds the durable asset application service.
 *
 * The service owns the upload, read and delete rules; persistence, object
 * storage, entitlements, time and ids all arrive as ports or injected
 * functions, so this module has no SDK, database or transport dependency.
 */
export function createAssetService({
	registry,
	objects,
	entitlements,
	clock,
	newId,
}: AssetServiceDependencies): AssetService {
	return {
		async upload(input: UploadAssetInput): Promise<AssetRecord> {
			const { userId, tenantId, kind, filename, body, contentType } =
				input;

			// Resolving the policy validates the kind (an unknown kind throws)
			// before any allowance, usage or object work happens.
			const assetKind = toAssetKind(kind);

			// The cap is a tenant allowance, so usage is summed across the whole
			// tenant while the object and the row stay user-scoped.
			const allowance = await entitlements.forUser(userId);
			const usage = await registry.sumUsage(tenantId);
			const size = Buffer.byteLength(body);

			if (
				allowance.storage_bytes !== null &&
				usage.bytes + size > allowance.storage_bytes
			) {
				throw new AssetCapExceededError(
					"bytes",
					`Uploading ${size} bytes would exceed the ${allowance.storage_bytes}-byte storage allowance.`
				);
			}

			if (
				allowance.storage_assets !== null &&
				usage.assets + 1 > allowance.storage_assets
			) {
				throw new AssetCapExceededError(
					"assets",
					`Uploading another asset would exceed the ${allowance.storage_assets}-asset storage allowance.`
				);
			}

			const assetId = newId();
			const key = buildUserAssetKey({
				userId,
				kind: assetKind,
				assetId,
				filename,
			});

			await objects.put({ key, body, contentType });

			const record: AssetRecord = {
				asset_id: assetId,
				user_id: userId,
				tenant_id: tenantId,
				kind: assetKind,
				key,
				filename,
				size_bytes: size,
				content_type: contentType,
				status: "ready",
				created_at: clock(),
				deleted_at: null,
			};

			try {
				return await registry.insert(record);
			} catch (error) {
				// A row that was never written must not leave its object behind.
				await objects.remove(key);
				throw error;
			}
		},

		async list({ userId, limit, offset }: ListAssetsInput) {
			return registry.listForUser(userId, { limit, offset });
		},

		async readUrl({ userId, assetId }: ReadAssetUrlInput) {
			const record = await findOwnedAsset(registry, userId, assetId);
			const url = await objects.presignGet(
				record.key,
				SIGNED_READ_TTL_SECONDS
			);

			return { url, expires_in: SIGNED_READ_TTL_SECONDS };
		},

		async remove({ userId, assetId }: RemoveAssetInput): Promise<boolean> {
			const record = await registry.findById(assetId);

			if (!record || record.user_id !== userId) {
				throw new AssetNotFoundError(assetId);
			}

			if (record.deleted_at !== null) {
				return false;
			}

			// Deliberate deviation from the decision page's "row-first" wording:
			// no sweeper exists yet, so a tombstone written before the object
			// delete would free the bytes while leaving an object nothing
			// retries. Deleting the object first keeps a failed call retryable
			// and the row live until the bytes are actually gone.
			await objects.remove(record.key);

			return registry.softDelete(assetId, clock());
		},
	};
}
