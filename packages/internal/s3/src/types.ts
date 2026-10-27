import type { FileTypeResult } from "file-type";
import type {
	AWSHeaders,
	CopyObjectOptions,
	CopyObjectResult,
	DataInput,
	DeleteObject,
	DeleteObjectResult,
	ErrorWithCode,
	ExistResponseCode,
	HttpMethod,
	ListObject,
	Logger,
	SSECHeaders,
	UploadPart,
} from "s3mini";

/**
 * Supported data payloads for put and upload operations.
 */
export type PutDataInput =
	DataInput | NodeJS.ReadableStream | ArrayBuffer | Uint8Array;

/**
 * Options for PutObject and Upload operations.
 */
export interface PutObjectOptions {
	/**
	 * MIME type of the uploaded object (e.g. `image/png`, `application/pdf`).
	 */
	contentType?: string;

	/**
	 * Alias for {@link contentType}.
	 */
	fileType?: string;

	/**
	 * Known content length of the data in bytes.
	 */
	contentLength?: number;

	/**
	 * Cache-Control header directive (e.g. `public, max-age=86400`).
	 */
	cacheControl?: string;

	/**
	 * Content-Disposition header directive (e.g. `inline`, `attachment; filename="doc.pdf"`).
	 */
	contentDisposition?: string;

	/**
	 * Custom metadata stored alongside the object in S3.
	 */
	metadata?: Record<string, string>;

	/**
	 * Server-Side Encryption with Customer-Provided Keys headers.
	 */
	ssecHeaders?: SSECHeaders;

	/**
	 * Additional AWS headers specific to this request.
	 */
	additionalHeaders?: AWSHeaders;
}

export type UploadOptions = PutObjectOptions;

/**
 * Result of PutObject and Upload operations.
 */
export interface PutObjectResult {
	/**
	 * The normalized object key in the S3 bucket.
	 */
	key: string;

	/**
	 * The bucket where the object was stored.
	 */
	bucket: string;

	/**
	 * The resolved public/CDN URL of the uploaded object.
	 */
	publicUrl: string;

	/**
	 * ETag returned by S3.
	 */
	etag?: string;

	/**
	 * The raw response from S3.
	 */
	response:
		| Response
		| { ok: boolean; status: number; headers: Map<string, string> };
}

export type UploadResult = PutObjectResult;

/**
 * Options for GetObject retrieval operations.
 */
export interface GetObjectOptions {
	/**
	 * Desired return format: "buffer", "stream", "string", "response", or "json".
	 */
	as?: "buffer" | "stream" | "string" | "response" | "json";

	/**
	 * Convenience flag: when true, returns Buffer.
	 */
	asBuffer?: boolean;

	/**
	 * Server-Side Encryption with Customer-Provided Keys headers.
	 */
	ssecHeaders?: SSECHeaders;

	/**
	 * Additional options passed to s3mini.
	 */
	opts?: Record<string, unknown>;
}

/**
 * Result of batch deletion operations.
 */
export interface DeleteBatchResult {
	deleted: string[];
	errors: Array<{
		key: string;
		code?: string;
		message?: string;
	}>;
}

/**
 * Options for generating pre-signed URLs.
 */
export interface PresignedUrlOptions {
	/**
	 * HTTP method to authorize: 'GET' for download, 'PUT' for upload (default: 'GET').
	 */
	method?: "GET" | "PUT";

	/**
	 * Expiration time in seconds (1–604800, default: 900s).
	 */
	expiresIn?: number;

	/**
	 * Alias for {@link expiresIn}.
	 */
	expiresInSeconds?: number;

	/**
	 * Pre-signed Content-Type header.
	 */
	contentType?: string;

	/**
	 * Pre-signed Content-Length header.
	 */
	contentLength?: number;

	/**
	 * Additional query parameters to include in the signed URL.
	 */
	queryParams?: Record<string, string>;

	/**
	 * Additional HTTP headers to sign.
	 */
	headers?: Record<string, string>;
}

/**
 * Options for structured key generation.
 */
export interface CreateKeyOptions {
	/**
	 * Custom prefix overriding the client default (e.g. `"t"`).
	 * Pass `null` or `""` to omit prefix entirely.
	 */
	prefix?: string | null;

	/**
	 * Whether to sanitize directory traversal sequences (`..`). Defaults to `true`.
	 */
	sanitize?: boolean;
}

export type {
	AWSHeaders,
	CopyObjectOptions,
	CopyObjectResult,
	DataInput,
	DeleteObject,
	DeleteObjectResult,
	ErrorWithCode,
	ExistResponseCode,
	FileTypeResult,
	HttpMethod,
	ListObject,
	Logger,
	SSECHeaders,
	UploadPart,
};
