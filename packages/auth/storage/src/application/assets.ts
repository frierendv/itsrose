import { StorageValidationError } from "@itsrose/s3";
import { buildUserAssetKey, parseStorageKey } from "../keys";
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
	/**
	 * Reads one object's bytes.
	 *
	 * Promotion uses this to copy a generated object into the durable root; it
	 * never modifies or removes the source object.
	 */
	download(key: string): Promise<Buffer>;
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

/**
 * Copies one generated object into the durable library.
 *
 * The source is named by its storage key rather than by bytes: a generated
 * object already lives in the bucket, so promotion downloads it, writes the
 * durable copy and registers that copy. The source is left where it is and
 * keeps expiring under the lifecycle rule.
 */
export type PromoteAssetInput = {
	userId: string;
	tenantId: string;
	/** Requested asset kind; checked against the closed policy table. */
	kind: string;
	/** Filename of the durable copy; the client chooses it on promotion. */
	filename: string;
	/** Generated object key under `t/users/{userId}/generated/`. */
	sourceKey: string;
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
	/** Copies a generated object into the library; the source object stays. */
	promote(input: PromoteAssetInput): Promise<AssetRecord>;
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

/**
 * The ephemeral category API-generated output is written under.
 *
 * It is the `generated` storage class: rooted at `t/`, readable through its
 * public URL, expired after one day and not counted against the storage
 * allowance until a copy is promoted into `assets/`.
 */
const GENERATED_CATEGORY = "generated";

/**
 * The media type recorded for a promoted asset.
 *
 * Promotion names a storage key, not a multipart part, and the object-store
 * port returns bytes only, so the source's content type cannot be recovered
 * here. The generic binary type keeps the required column honest instead of
 * guessing one from the filename or the kind.
 */
const PROMOTED_CONTENT_TYPE = "application/octet-stream";

/** The write a cap check guards; only the error message differs. */
type StorageWriteAction = "Uploading" | "Promoting";

/**
 * Enforces the tenant-wide storage allowance for one new object.
 *
 * Upload and promotion both add one object and its bytes, so both pass through
 * this single check once the size is known and before anything is written; a
 * rejected write leaves no object and no row.
 */
async function assertWithinAllowance(
	entitlements: AssetEntitlementPort,
	registry: AssetRegistryPort,
	input: {
		userId: string;
		tenantId: string;
		size: number;
		action: StorageWriteAction;
	}
): Promise<void> {
	// The cap is a tenant allowance, so usage is summed across the whole
	// tenant while the object and the row stay user-scoped.
	const allowance = await entitlements.forUser(input.userId);
	const usage = await registry.sumUsage(input.tenantId);

	if (
		allowance.storage_bytes !== null &&
		usage.bytes + input.size > allowance.storage_bytes
	) {
		throw new AssetCapExceededError(
			"bytes",
			`${input.action} ${input.size} bytes would exceed the ${allowance.storage_bytes}-byte storage allowance.`
		);
	}

	if (
		allowance.storage_assets !== null &&
		usage.assets + 1 > allowance.storage_assets
	) {
		throw new AssetCapExceededError(
			"assets",
			`${input.action} another asset would exceed the ${allowance.storage_assets}-asset storage allowance.`
		);
	}
}

/** The fields a durable write supplies to {@link buildAssetRecord}. */
type AssetRecordInput = {
	assetId: string;
	userId: string;
	tenantId: string;
	kind: AssetKind;
	key: string;
	filename: string;
	size: number;
	contentType: string;
	createdAt: Date;
};

/**
 * Builds the registry row a durable write stores.
 *
 * Upload and promotion write the same row shape; only the object and its
 * content type differ.
 */
function buildAssetRecord(input: AssetRecordInput): AssetRecord {
	return {
		asset_id: input.assetId,
		user_id: input.userId,
		tenant_id: input.tenantId,
		kind: input.kind,
		key: input.key,
		filename: input.filename,
		size_bytes: input.size,
		content_type: input.contentType,
		status: "ready",
		created_at: input.createdAt,
		deleted_at: null,
	};
}

/**
 * Inserts the row and removes the durable object when the insert fails.
 *
 * A row that was never written must not leave its object behind. Only the new
 * durable object is removed; a promotion's generated source is untouched.
 */
async function insertWithCompensation(
	registry: AssetRegistryPort,
	objects: AssetObjectStorePort,
	record: AssetRecord
): Promise<AssetRecord> {
	try {
		return await registry.insert(record);
	} catch (error) {
		await objects.remove(record.key);
		throw error;
	}
}

/* -------------------------------------------------------------------------- */
/*                                  Service                                   */
/* -------------------------------------------------------------------------- */

/**
 * Builds the durable asset application service.
 *
 * The service owns the upload, promotion, read and delete rules; persistence,
 * object storage, entitlements, time and ids all arrive as ports or injected
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

			const size = Buffer.byteLength(body);

			await assertWithinAllowance(entitlements, registry, {
				userId,
				tenantId,
				size,
				action: "Uploading",
			});

			const assetId = newId();
			const key = buildUserAssetKey({
				userId,
				kind: assetKind,
				assetId,
				filename,
			});

			await objects.put({ key, body, contentType });

			return insertWithCompensation(
				registry,
				objects,
				buildAssetRecord({
					assetId,
					userId,
					tenantId,
					kind: assetKind,
					key,
					filename,
					size,
					contentType,
					createdAt: clock(),
				})
			);
		},

		async promote(input: PromoteAssetInput): Promise<AssetRecord> {
			const { userId, tenantId, kind, filename, sourceKey } = input;

			// A promoted row is a durable asset, so it resolves through the
			// same kind check as an upload.
			const assetKind = toAssetKind(kind);

			const source = parseStorageKey(sourceKey);

			// One rejection for every malformed, foreign or wrong-class key:
			// the caller must not learn whether the object exists.
			if (
				!source ||
				source.root !== "ephemeral" ||
				source.type !== "user" ||
				source.userId !== userId ||
				source.category !== GENERATED_CATEGORY
			) {
				throw new StorageValidationError(
					"The source key does not name a generated object owned by the caller."
				);
			}

			// Promotion copies the bytes, so the size comes from the object
			// itself rather than from a client-declared value.
			const bytes = await objects.download(sourceKey);
			const size = bytes.length;

			await assertWithinAllowance(entitlements, registry, {
				userId,
				tenantId,
				size,
				action: "Promoting",
			});

			const assetId = newId();
			const key = buildUserAssetKey({
				userId,
				kind: assetKind,
				assetId,
				filename,
			});

			// The copy is what the library owns and what the cap counts; the
			// generated source stays in place and keeps expiring under the
			// lifecycle rule, so it is deliberately not removed here.
			await objects.put({
				key,
				body: bytes,
				contentType: PROMOTED_CONTENT_TYPE,
			});

			return insertWithCompensation(
				registry,
				objects,
				buildAssetRecord({
					assetId,
					userId,
					tenantId,
					kind: assetKind,
					key,
					filename,
					size,
					contentType: PROMOTED_CONTENT_TYPE,
					createdAt: clock(),
				})
			);
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
