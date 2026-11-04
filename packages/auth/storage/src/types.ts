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

export type { StorageConfig };
