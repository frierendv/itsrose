import { SystemError } from "@itsrose/system";
import type { FileTypeResult } from "file-type";
import {
	runInBatches,
	S3Error,
	S3mini as S3Mini,
	S3NetworkError,
	S3ServiceError,
	sanitizeETag,
	type AWSHeaders,
	type CompleteMultipartUploadResult,
	type CopyObjectOptions,
	type CopyObjectResult,
	type DataInput,
	type DeleteObject,
	type DeleteObjectResult,
	type ErrorWithCode,
	type ExistResponseCode,
	type HttpMethod,
	type ListBucketResponse,
	type ListMultipartUploadResponse,
	type ListObject,
	type Logger,
	type S3Config as S3miniConfig,
	type SSECHeaders,
	type UploadPart,
} from "s3mini";
import { getExtension, lookupExtension, lookupMimeType } from "./mime";
import type {
	CreateKeyOptions,
	S3Config,
	UploadOptions,
	UploadResult,
} from "./types";

export const TEMP_KEY = "t" as const;
export const PUBLIC_KEY = "public" as const;

/**
 * S3 client for the ItsRose platform built on top of {@linkcode S3Mini}.
 */
export class S3 extends S3Mini {
	/**
	 * Domain for public asset serving (e.g. Cloudflare R2 custom domain, CloudFront, or `r2.dev`).
	 */
	readonly publicDomain?: string;

	/**
	 * Default folder prefix used when creating keys (default: {@linkcode TEMP_KEY} = `"t"`).
	 */
	readonly defaultPrefix: string;

	/**
	 * Protocol to use when generating public URLs for {@linkcode publicDomain}.
	 */
	protected readonly publicProtocol: string = "https:";

	constructor({ publicDomain, defaultPrefix = TEMP_KEY, ...opts }: S3Config) {
		super(opts);
		this.defaultPrefix = defaultPrefix;

		if (publicDomain) {
			const raw = publicDomain.trim();
			if (/^https?:\/\//i.test(raw)) {
				this.publicProtocol = raw.toLowerCase().startsWith("http://")
					? "http:"
					: "https:";
			}
			this.publicDomain = raw
				.replace(/^https?:\/\//i, "")
				.replace(/^\/+|\/+$/g, "");
		}
	}

	/**
	 * Generates a structured object key.
	 *
	 * Normalizes slashes, trims whitespace, sanitizes directory traversal sequences,
	 * and defaults omitted or null paths to {@linkcode PUBLIC_KEY}.
	 *
	 * @example
	 * ```ts
	 * s3.createKey("audio.mp3"); // "t/public/audio.mp3"
	 * s3.createKey("audio.mp3", "music"); // "t/music/audio.mp3"
	 * s3.createKey("audio.mp3", "music", { prefix: "uploads" }); // "uploads/music/audio.mp3"
	 * s3.createKey("audio.mp3", "music", { prefix: null }); // "music/audio.mp3"
	 * ```
	 */
	public createKey<
		const T extends string,
		const Path extends string = typeof PUBLIC_KEY,
		const Key extends string = `${typeof TEMP_KEY}/${Path}/${T}`,
	>(fileName: T, path?: Path | null, options?: CreateKeyOptions): Key {
		const prefix =
			options?.prefix !== undefined ? options.prefix : this.defaultPrefix;

		const targetPath =
			path === null || path === undefined || path === ""
				? PUBLIC_KEY
				: path;

		const segments: string[] = [];

		if (prefix) {
			segments.push(prefix);
		}

		if (targetPath) {
			segments.push(targetPath);
		}

		segments.push(fileName);

		let joined = segments.join("/");

		// Sanitize directory traversal if enabled (default true)
		if (options?.sanitize !== false) {
			joined = joined.replace(/(^|\/)\.\.(?=\/|$)/g, "");
		}

		const key = joined
			.replace(/\\+/g, "/")
			.replace(/\/{2,}/g, "/")
			.replace(/^\/+|\/+$/g, "");

		return key as Key;
	}

	/**
	 * Detects the MIME type and file extension from a buffer or array buffer.
	 * Falls back to extension lookup from `fallbackFileNameOrExt`, or `application/octet-stream`.
	 *
	 * @param data - Binary buffer or array buffer to inspect.
	 * @param fallbackFileNameOrExt - Optional filename or extension to inspect if magic numbers don't match.
	 */
	public async getFileType(
		data: Buffer | Uint8Array | ArrayBuffer,
		fallbackFileNameOrExt?: string
	): Promise<FileTypeResult> {
		const uint8 = data instanceof Uint8Array ? data : new Uint8Array(data);

		if (uint8.byteLength > 0) {
			const { fileTypeFromBuffer } = await import("file-type");
			const ft = await fileTypeFromBuffer(uint8);
			if (ft) {
				return ft;
			}
		}

		if (fallbackFileNameOrExt) {
			const ext =
				getExtension(fallbackFileNameOrExt) ??
				fallbackFileNameOrExt.toLowerCase().replace(/^\./, "");
			const mime = lookupMimeType(ext);
			if (mime) {
				return { ext, mime };
			}
		}

		return { ext: "bin", mime: "application/octet-stream" };
	}

	/**
	 * Inferred content type resolver for uploads.
	 */
	protected async resolveContentType(
		key: string,
		data: unknown,
		explicitType?: string
	): Promise<string> {
		if (explicitType && explicitType.trim().length > 0) {
			return explicitType.trim();
		}

		if (typeof Blob !== "undefined" && data instanceof Blob && data.type) {
			return data.type;
		}

		if (Buffer.isBuffer(data) || data instanceof Uint8Array) {
			const ft = await this.getFileType(data, key);
			if (ft.mime !== "application/octet-stream") {
				return ft.mime;
			}
		} else if (data instanceof ArrayBuffer) {
			const ft = await this.getFileType(new Uint8Array(data), key);
			if (ft.mime !== "application/octet-stream") {
				return ft.mime;
			}
		}

		if (typeof data === "string") {
			const ext = getExtension(key);
			if (ext) {
				const mime = lookupMimeType(ext);
				if (mime) {
					return mime.startsWith("text/") ||
						mime === "application/json"
						? `${mime}; charset=utf-8`
						: mime;
				}
			}

			const trimmed = data.trim();
			if (
				(trimmed.startsWith("{") && trimmed.endsWith("}")) ||
				(trimmed.startsWith("[") && trimmed.endsWith("]"))
			) {
				try {
					JSON.parse(trimmed);
					return "application/json; charset=utf-8";
				} catch {
					// Fall through to plain text
				}
			}

			return "text/plain; charset=utf-8";
		}

		const ext = getExtension(key);
		if (ext) {
			const mime = lookupMimeType(ext);
			if (mime) {
				return mime;
			}
		}

		return "application/octet-stream";
	}

	/**
	 * Uploads an object with automatic MIME-type inference if not explicitly provided.
	 */
	override async putObject(
		key: string,
		data: string | DataInput | ReadableStream | File | Blob,
		fileType?: string,
		ssecHeaders?: SSECHeaders,
		additionalHeaders?: AWSHeaders,
		contentLength?: number
	): Promise<Response> {
		const resolvedType = await this.resolveContentType(key, data, fileType);
		return super.putObject(
			key,
			data,
			resolvedType,
			ssecHeaders,
			additionalHeaders,
			contentLength
		);
	}

	/**
	 * Uploads an object using single PUT or multipart upload depending on size,
	 * with automatic MIME-type inference if not explicitly provided.
	 */
	override async putAnyObject(
		key: string,
		data: DataInput,
		fileType?: string,
		ssecHeaders?: SSECHeaders,
		additionalHeaders?: AWSHeaders,
		contentLength?: number
	) {
		const resolvedType = await this.resolveContentType(key, data, fileType);
		return super.putAnyObject(
			key,
			data,
			resolvedType,
			ssecHeaders,
			additionalHeaders,
			contentLength
		);
	}

	/**
	 * High-level upload method that uploads data to S3 and returns the public URL.
	 *
	 * @example
	 * ```ts
	 * const { publicUrl } = await s3.upload(key, audioBuffer);
	 * ```
	 */
	public async upload(
		key: string,
		data: DataInput,
		options: UploadOptions = {}
	): Promise<UploadResult> {
		const contentType = options.contentType ?? options.fileType;
		const response = await this.putAnyObject(
			key,
			data,
			contentType,
			options.ssecHeaders,
			options.additionalHeaders,
			options.contentLength
		);

		const publicUrl = this.getObjectPublicUrl(key);
		return { key, publicUrl, response };
	}

	/**
	 * Checks if an object exists in the bucket.
	 * Returns `true` if found, `false` otherwise.
	 */
	public async exists(key: string): Promise<boolean> {
		const res = await this.objectExists(key);
		return res === true;
	}

	/**
	 * Generates a public object URL.
	 * Prioritizes the custom `publicDomain` and falls back to standard AWS S3 or endpoint logic.
	 *
	 * @param key - The key of the object.
	 * @returns The resolved public URL string.
	 * @throws {SystemError} If key is empty or bucket is missing.
	 */
	public getObjectPublicUrl(key: string): string {
		const cleanKey = key.trim().replace(/^\/+|\/+$/g, "");
		if (!cleanKey) {
			throw new SystemError(
				"Cannot generate an S3 public URL for an empty key."
			);
		}

		// Prioritize custom domain or R2 public access setups
		if (this.publicDomain) {
			const rawDomain = this.publicDomain.trim();
			const hasProtocol = /^https?:\/\//i.test(rawDomain);
			const protocol = hasProtocol
				? (rawDomain.match(/^https?:\/\//i)?.[0].toLowerCase() ??
					`${this.publicProtocol}//`)
				: `${this.publicProtocol}//`;

			const domainWithoutProto = rawDomain
				.replace(/^https?:\/\//i, "")
				.replace(/^\/+|\/+$/g, "");

			const url = new URL(`${protocol}${domainWithoutProto}`);
			const basePath = url.pathname.replace(/\/+$/, "");
			url.pathname = basePath
				? `${basePath}/${cleanKey}`
				: `/${cleanKey}`;
			return url.toString();
		}

		// Fall back to standard S3 endpoint logic using s3mini configuration fields
		const bucket = this.bucketName;
		const hostname = this.endpoint.hostname;

		if (hostname.endsWith(".amazonaws.com")) {
			if (!bucket) {
				throw new SystemError(
					"Cannot generate an S3 public URL without a configured bucket."
				);
			}
			const region =
				this.region && this.region !== "auto" ? this.region : undefined;
			const host = region
				? `${bucket}.s3.${region}.amazonaws.com`
				: `${bucket}.s3.amazonaws.com`;
			return `https://${host}/${cleanKey}`;
		}

		// Custom or S3-compatible service (MinIO, R2, Wasabi, etc.)
		const endpointHref = this.endpoint.href.replace(/\/+$/, "");
		if (bucket && !this.endpoint.pathname.includes(bucket)) {
			return `${endpointHref}/${bucket}/${cleanKey}`;
		}

		return `${endpointHref}/${cleanKey}`;
	}

	/**
	 * Static lookup for MIME type by file name or extension.
	 */
	public static lookupMimeType = lookupMimeType;

	/**
	 * Static lookup for file extension by MIME type.
	 */
	public static lookupExtension = lookupExtension;
}

declare module "s3mini" {
	interface S3Config {
		publicDomain?: string;
		defaultPrefix?: string;
	}
}

export {
	S3Error,
	S3NetworkError,
	S3ServiceError,
	sanitizeETag,
	runInBatches,
	type CompleteMultipartUploadResult,
	type CopyObjectOptions,
	type CopyObjectResult,
	type DeleteObject,
	type DeleteObjectResult,
	type ErrorWithCode,
	type ExistResponseCode,
	type HttpMethod,
	type ListBucketResponse,
	type ListMultipartUploadResponse,
	type ListObject,
	type Logger,
	type S3miniConfig,
	type UploadPart,
};
