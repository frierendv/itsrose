/**
 * Configuration required to connect to a Cloudflare R2 bucket.
 */
export interface StorageClientConfig {
	/**
	 * Cloudflare account ID used to construct the R2 endpoint.
	 *
	 * @example "8f3b2c1a4d5e6f7a8b9c0d1e2f3a4b5c"
	 */
	accountId: string;

	/**
	 * R2 Access Key ID (from an S3 API token).
	 */
	accessKeyId: string;

	/**
	 * R2 Secret Access Key (from an S3 API token).
	 */
	secretAccessKey: string;

	/**
	 * Target bucket name.
	 */
	bucket: string;

	/**
	 * Global prefix/folder applied to every object key.
	 *
	 * @example "app/assets" — uploading "avatar.png" resolves to "app/assets/avatar.png".
	 */
	keyPrefix?: string;

	/**
	 * Custom domain used to serve public R2 buckets.
	 *
	 * @example "cdn.myapp.com" or "https://cdn.myapp.com"
	 */
	publicDomain?: string;
}

/**
 * Options for {@link StorageClient.upload}.
 */
export interface UploadOptions {
	/**
	 * MIME type of the uploaded object. When omitted, it is detected from the
	 * payload's magic bytes.
	 */
	contentType?: string;

	/**
	 * `Cache-Control` header applied to the uploaded object.
	 */
	cacheControl?: string;

	/**
	 * Custom metadata stored alongside the object in R2.
	 */
	metadata?: Record<string, string>;
}

/**
 * Result of {@link StorageClient.upload}.
 */
export interface UploadResult {
	/**
	 * The fully resolved object key (including any configured key prefix).
	 */
	key: string;

	/**
	 * Public URL of the uploaded object, when a `publicDomain` is configured.
	 */
	url?: string;

	/**
	 * ETag returned by R2 for the uploaded object.
	 */
	etag?: string;
}

/**
 * A listed object, normalized from the S3 `ListObjectsV2` response.
 */
export interface StorageObject {
	key: string;
	size?: number;
	lastModified?: Date;
	etag?: string;
}

/**
 * Options for {@link StorageClient.getPresignedUploadUrl}.
 */
export interface PresignedUploadOptions {
	contentType?: string;
	expiresIn?: number;
}

/**
 * Result of a batch delete operation.
 */
export interface DeleteResult {
	deleted: string[];
	errors: Array<{ key: string; code?: string; message?: string }>;
}
