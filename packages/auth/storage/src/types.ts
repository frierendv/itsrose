import type { StorageClient } from "@itsrose/s3";
import type { StorageConfig } from "./config";

/**
 * Parameters for saving an ephemeral file under `t/`.
 */
export interface SaveEphemeralFileParams {
	/**
	 * Explicit storage key (must begin with `t/` or will have `t/` prepended).
	 */
	key?: string;

	/**
	 * Scoped user identifier (optional if key or system category is used).
	 */
	userId?: string;

	/**
	 * Sub-category prefix (e.g. "exports", "temp", "reports").
	 */
	category?: string;

	/**
	 * Target filename or file path.
	 */
	filename?: string;

	/**
	 * Binary payload to write (Buffer or base64 string).
	 */
	body: Buffer | string;

	/**
	 * Optional MIME type of the payload.
	 */
	contentType?: string;

	/**
	 * Optional Cache-Control header override.
	 */
	cacheControl?: string;
}

/**
 * Result of saving an ephemeral file.
 */
export interface EphemeralFileResult {
	key: string;
	publicUrl: string;
	etag?: string;
	contentType?: string;
}

/**
 * Parameters for resolving an ephemeral file URL.
 */
export interface GetEphemeralUrlParams {
	key: string;
	/**
	 * Whether to generate a public CDN/bucket URL (default: true)
	 * or a short-lived pre-signed download URL.
	 */
	isPublic?: boolean;
	/**
	 * TTL in seconds if generating a pre-signed URL (default: 900s).
	 */
	expiresInSeconds?: number;
}

/**
 * Alias for {@link GetEphemeralUrlParams}.
 */
export type GetEphemeralFileUrlParams = GetEphemeralUrlParams;

/**
 * Parameters for generating a scoped pre-signed upload URL.
 */
export interface CreatePresignedUploadParams {
	/**
	 * Explicit storage key (must begin with `t/` or will have `t/` prepended).
	 */
	key?: string;
	userId?: string;
	category?: string;
	filename?: string;
	contentType?: string;
	expiresInSeconds?: number;
}

export interface PresignedUploadResult {
	key: string;
	uploadUrl: string;
	publicUrl: string;
	expiresIn: number;
}

export interface PresignedUploadOptions {
	expiresIn?: number;
	contentType?: string;
}

export interface UserStorageFile {
	key: string;
	userId: string;
	category: string;
	filename: string;
	publicUrl: string;
	size?: number;
	lastModified?: Date;
	etag?: string;
	contentType?: string;
}

export interface UserStoragePurgeResult {
	userId: string;
	deleted: string[];
	errors: Array<{ key: string; code?: string; message?: string }>;
}

export interface StoragePluginOptions {
	config?: Partial<StorageConfig>;
	s3?: StorageClient;
	autoPurgeOnAccountDelete?: boolean;
}

/* -------------------------------------------------------------------------- */
/*                               Asset registry                               */
/* -------------------------------------------------------------------------- */

/**
 * One durable asset as stored in `asset_registry`.
 *
 * The row — not the object key — is what grants ownership, so the whole row is
 * carried here. Columns are `snake_case` because this is the database shape.
 */
export type AssetRecord = {
	/** Application identity of the asset, unique per row. */
	asset_id: string;
	user_id: string;
	tenant_id: string;
	/** Asset kind, resolved to a storage policy by the caller. */
	kind: string;
	/** Durable object key under the `assets/` root. */
	key: string;
	filename: string;
	/** Object size in bytes. */
	size_bytes: number;
	content_type: string;
	/** `ready` once the object and its row both exist. */
	status: string;
	created_at: Date | string;
	/** Soft delete marker; `null` while the asset is live. */
	deleted_at: Date | string | null;
};

/**
 * Page window for {@link AssetRegistryPort.listForUser}.
 */
export type AssetListOptions = {
	/** Maximum number of rows to return, `1`–`200`. */
	limit: number;
	/** Number of live rows to skip. */
	offset: number;
};

/**
 * Live usage of one tenant's assets, in bytes and count.
 */
export type AssetUsage = {
	/** Sum of `size_bytes` over non-deleted rows. */
	bytes: number;
	/** Number of non-deleted rows. */
	assets: number;
};

/**
 * Persistence port for the durable asset registry.
 *
 * Declared here so the application layer never imports the Postgres adapter;
 * the adapter maps snake_case columns onto {@link AssetRecord}.
 */
export type AssetRegistryPort = {
	/** Inserts one row and returns the stored record. */
	insert: (record: AssetRecord) => Promise<AssetRecord>;
	/**
	 * Reads one row by application id.
	 *
	 * A soft-deleted row is still returned, with its `deleted_at`, so a caller
	 * can tell "deleted" from "never existed".
	 */
	findById: (asset_id: string) => Promise<AssetRecord | null>;
	/** Newest first; soft-deleted rows are excluded. */
	listForUser: (
		user_id: string,
		options: AssetListOptions
	) => Promise<AssetRecord[]>;
	/**
	 * Marks the row deleted without removing it.
	 *
	 * Returns `false` when the row was already deleted, which makes a retried
	 * delete a no-op.
	 */
	softDelete: (asset_id: string, at: Date) => Promise<boolean>;
	/**
	 * Live bytes and count for one tenant; zero when the tenant owns nothing.
	 *
	 * The storage cap is a tenant allowance, not a per-member one, so usage is
	 * summed over `tenant_id` rather than `user_id`: an organization tenant
	 * keeps one cap across all of its members.
	 */
	sumUsage: (tenant_id: string) => Promise<AssetUsage>;
};

export type { StorageConfig };
