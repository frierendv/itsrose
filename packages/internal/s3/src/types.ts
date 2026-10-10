import type { FileTypeResult } from "file-type";
import type {
	AWSHeaders,
	DataInput,
	S3Config as S3miniConfig,
	SSECHeaders,
} from "s3mini";

/**
 * Configuration options for the {@link S3} client.
 */
export interface S3Config extends S3miniConfig {
	/**
	 * Optional domain for public asset serving (e.g., Cloudflare R2 custom domain, CloudFront, or `r2.dev`).
	 * Can include or omit `https://`, and can include subpaths (e.g. `cdn.itsrose.rest/media`).
	 */
	publicDomain?: string;
	/**
	 * Default prefix folder for generated keys (defaults to `"t"`).
	 */
	defaultPrefix?: string;
}

/**
 * Options for generating S3 object keys with {@link S3.createKey}.
 */
export interface CreateKeyOptions {
	/**
	 * Custom prefix folder for the key.
	 * Defaults to `TEMP_KEY` (`"t"`). If set to `null` or `""`, the prefix is omitted.
	 */
	prefix?: string | null;
	/**
	 * Whether to sanitize the key path against directory traversal (`..`).
	 * Defaults to `true`.
	 */
	sanitize?: boolean;
}

/**
 * Options for uploading objects.
 */
export interface UploadOptions {
	/**
	 * Explicit MIME type / Content-Type of the file.
	 * If omitted, it will be automatically inferred from data and key.
	 */
	contentType?: string;
	/**
	 * Alias for {@link contentType}.
	 */
	fileType?: string;
	/**
	 * Server-Side Encryption with Customer-Provided Keys headers.
	 */
	ssecHeaders?: SSECHeaders;
	/**
	 * Additional `x-amz-*` headers specific to this request.
	 */
	additionalHeaders?: AWSHeaders;
	/**
	 * Known content length of the data in bytes.
	 */
	contentLength?: number;
}

/**
 * Result of high-level upload operations.
 */
export interface UploadResult {
	/**
	 * The object key in the S3 bucket.
	 */
	key: string;
	/**
	 * The public URL of the uploaded object.
	 */
	publicUrl: string;
	/**
	 * The raw response from S3.
	 */
	response:
		| Response
		| { ok: boolean; status: number; headers: Map<string, string> };
}

export type { FileTypeResult, AWSHeaders, DataInput, SSECHeaders };
