import { Readable } from "node:stream";
import type { FileTypeResult } from "file-type";
import {
	runInBatches,
	S3mini,
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
import {
	extractBucketName,
	normalizePublicDomain,
	PUBLIC_KEY,
	resolveS3miniEndpoint,
	TEMP_KEY,
	type S3Config,
} from "./config";
import {
	detectFileType,
	lookupExtension,
	lookupMimeType,
	resolveContentType,
} from "./mime";
import type {
	CreateKeyOptions,
	DeleteBatchResult,
	GetObjectOptions,
	PresignedUrlOptions,
	PutDataInput,
	PutObjectOptions,
	UploadOptions,
	UploadResult,
} from "./types";
import {
	getObjectPublicUrl,
	normalizeStorageKey,
	type GetObjectPublicUrlOptions,
} from "./url";

function isNodeReadable(val: unknown): val is Readable {
	return Boolean(
		val &&
		typeof val === "object" &&
		"pipe" in val &&
		typeof (val as Record<string, unknown>).pipe === "function"
	);
}

/**
 * Lightweight, zero-bloat S3 client tailored for modern runtimes, Cloudflare R2, and MinIO.
 * Powered by `s3mini`.
 */
export class S3 extends S3mini {
	/**
	 * Cloudflare R2 custom domain or public CDN domain (e.g. `https://pub-cdn.itsrose.net`).
	 */
	readonly customDomain?: string;

	/**
	 * Domain for public asset serving (e.g. Cloudflare R2 custom domain, CloudFront, or `r2.dev`).
	 */
	readonly publicDomain?: string;

	/**
	 * Default folder prefix used when creating keys (default: {@linkcode TEMP_KEY} = `"t"`).
	 */
	readonly defaultPrefix: string;

	/**
	 * Active bucket name.
	 */
	readonly bucket: string;

	/**
	 * Protocol to use when generating public URLs for {@linkcode publicDomain}.
	 */
	protected readonly publicProtocol: string = "https:";

	constructor(config: S3Config = {}) {
		const rawEndpoint = config.endpoint ?? "https://s3.amazonaws.com";
		const configuredBucket =
			config.bucket ??
			config.bucketName ??
			extractBucketName(rawEndpoint) ??
			"";
		const resolvedEndpoint = resolveS3miniEndpoint(
			rawEndpoint,
			configuredBucket
		);

		super({
			accessKeyId: config.accessKeyId ?? "",
			secretAccessKey: config.secretAccessKey ?? "",
			endpoint: resolvedEndpoint,
			region: config.region ?? "auto",
			requestSizeInBytes: config.requestSizeInBytes,
			requestAbortTimeout: config.requestAbortTimeout,
			minPartSize: config.minPartSize,
			logger: config.logger,
			fetch: config.fetch,
		});

		this.bucket = configuredBucket || this.bucketName;
		this.defaultPrefix = config.defaultPrefix ?? TEMP_KEY;

		const explicitCustomDomain = config.customDomain ?? config.publicCdnUrl;
		if (explicitCustomDomain) {
			this.customDomain = explicitCustomDomain.trim();
		}

		if (config.publicDomain) {
			const { domain, protocol } = normalizePublicDomain(
				config.publicDomain
			);
			this.publicDomain = domain;
			this.publicProtocol = protocol;
		} else if (this.customDomain) {
			const { domain, protocol } = normalizePublicDomain(
				this.customDomain
			);
			this.publicDomain = domain;
			this.publicProtocol = protocol;
		}
	}

	/**
	 * Generates a structured object key.
	 *
	 * Normalizes slashes, trims whitespace, sanitizes directory traversal sequences,
	 * and defaults omitted or null paths to {@linkcode PUBLIC_KEY}.
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
	 * Detects MIME type and file extension from a buffer or array buffer.
	 */
	public async getFileType(
		data: Buffer | Uint8Array | ArrayBuffer,
		fallbackFileNameOrExt?: string
	): Promise<FileTypeResult> {
		return detectFileType(data, fallbackFileNameOrExt);
	}

	/**
	 * Put object using single PUT or multipart upload depending on size,
	 * with automatic MIME-type inference if not explicitly provided.
	 */
	public override async putAnyObject(
		key: string,
		data: DataInput,
		fileType?: string,
		ssecHeaders?: SSECHeaders,
		additionalHeaders?: AWSHeaders,
		contentLength?: number
	) {
		const cleanKey = normalizeStorageKey(key, this.bucket);
		const resolvedType = await resolveContentType(cleanKey, data, fileType);
		return super.putAnyObject(
			cleanKey,
			data,
			resolvedType,
			ssecHeaders,
			additionalHeaders,
			contentLength
		);
	}

	/**
	 * Uploads an object to S3.
	 * Supports options bag as 3rd parameter or positional parameters.
	 */
	public override putObject(
		key: string,
		body: PutDataInput,
		options?: PutObjectOptions
	): Promise<Response>;
	public override putObject(
		key: string,
		data: string | DataInput | ReadableStream | File | Blob,
		fileType?: string,
		ssecHeaders?: SSECHeaders,
		additionalHeaders?: AWSHeaders,
		contentLength?: number
	): Promise<Response>;
	public override async putObject(
		key: string,
		body: PutDataInput,
		optionsOrFileType?: string | PutObjectOptions,
		maybeSsecHeaders?: SSECHeaders,
		maybeAdditionalHeaders?: AWSHeaders,
		maybeContentLength?: number
	): Promise<Response> {
		const cleanKey = normalizeStorageKey(key, this.bucket);

		const options: PutObjectOptions =
			typeof optionsOrFileType === "object"
				? optionsOrFileType
				: {
						fileType: optionsOrFileType,
						ssecHeaders: maybeSsecHeaders,
						additionalHeaders: maybeAdditionalHeaders,
						contentLength: maybeContentLength,
					};

		let data: DataInput;
		if (isNodeReadable(body) && typeof Readable.toWeb === "function") {
			data = Readable.toWeb(body) as unknown as DataInput;
		} else {
			data = body as DataInput;
		}

		const contentType = await resolveContentType(
			cleanKey,
			data,
			options.contentType ?? options.fileType
		);

		const headers: Record<string, string> = {
			...(options.additionalHeaders ?? {}),
		};

		if (options.cacheControl) {
			headers["cache-control"] = options.cacheControl;
		}

		if (options.contentDisposition) {
			headers["content-disposition"] = options.contentDisposition;
		}

		if (options.metadata) {
			for (const [metaKey, metaValue] of Object.entries(
				options.metadata
			)) {
				const headerKey = metaKey
					.toLowerCase()
					.startsWith("x-amz-meta-")
					? metaKey.toLowerCase()
					: `x-amz-meta-${metaKey.toLowerCase()}`;
				headers[headerKey] = metaValue;
			}
		}

		return super.putObject(
			cleanKey,
			data,
			contentType,
			options.ssecHeaders,
			headers as unknown as AWSHeaders,
			options.contentLength
		);
	}

	/**
	 * High-level upload method that returns key, bucket, publicUrl, and etag.
	 */
	public async upload(
		key: string,
		data: PutDataInput,
		options: UploadOptions = {}
	): Promise<UploadResult> {
		const cleanKey = normalizeStorageKey(key, this.bucket);
		let payload: DataInput;
		if (isNodeReadable(data) && typeof Readable.toWeb === "function") {
			payload = Readable.toWeb(data) as unknown as DataInput;
		} else {
			payload = data as DataInput;
		}

		const contentType = options.contentType ?? options.fileType;
		let headers: Record<string, string> | undefined =
			options.additionalHeaders
				? { ...options.additionalHeaders }
				: undefined;

		if (options.cacheControl) {
			headers = headers ?? {};
			headers["cache-control"] = options.cacheControl;
		}

		if (options.contentDisposition) {
			headers = headers ?? {};
			headers["content-disposition"] = options.contentDisposition;
		}

		if (options.metadata) {
			headers = headers ?? {};
			for (const [metaKey, metaValue] of Object.entries(
				options.metadata
			)) {
				const headerKey = metaKey
					.toLowerCase()
					.startsWith("x-amz-meta-")
					? metaKey.toLowerCase()
					: `x-amz-meta-${metaKey.toLowerCase()}`;
				headers[headerKey] = metaValue;
			}
		}

		const response = await this.putAnyObject(
			cleanKey,
			payload,
			contentType,
			options.ssecHeaders,
			headers ? (headers as unknown as AWSHeaders) : undefined,
			options.contentLength
		);

		const rawEtag =
			"headers" in response &&
			typeof (response.headers as any).get === "function"
				? (response.headers as any).get("etag")
				: undefined;
		const etag = rawEtag ? sanitizeETag(rawEtag) : undefined;
		const publicUrl = this.getPublicUrl(cleanKey);

		return {
			key: cleanKey,
			bucket: this.bucket,
			publicUrl,
			etag,
			response: response as any,
		};
	}

	/**
	 * Retrieves an object as string. Supports options object for buffer or stream retrieval.
	 */
	public override getObject(
		key: string,
		opts?: Record<string, unknown>,
		ssecHeaders?: SSECHeaders
	): Promise<string | null>;
	public override getObject(
		key: string,
		options?: GetObjectOptions
	): Promise<
		string | Buffer | NodeJS.ReadableStream | Response | unknown | null
	>;
	public override async getObject(
		key: string,
		optsOrOptions?: Record<string, unknown> | GetObjectOptions,
		maybeSsecHeaders?: SSECHeaders
	): Promise<
		string | Buffer | NodeJS.ReadableStream | Response | unknown | null
	> {
		const cleanKey = normalizeStorageKey(key, this.bucket);

		if (
			optsOrOptions &&
			("as" in optsOrOptions || "asBuffer" in optsOrOptions)
		) {
			const options = optsOrOptions as GetObjectOptions;
			if (options.asBuffer || options.as === "buffer") {
				return this.getObjectBuffer(cleanKey);
			}
			if (options.as === "stream") {
				return this.getObjectStream(cleanKey);
			}
			if (options.as === "response") {
				return super.getObjectResponse(
					cleanKey,
					options.opts,
					options.ssecHeaders
				);
			}
			if (options.as === "json") {
				return super.getObjectJSON(
					cleanKey,
					options.opts,
					options.ssecHeaders
				);
			}
			return super.getObject(cleanKey, options.opts, options.ssecHeaders);
		}

		return super.getObject(
			cleanKey,
			optsOrOptions as Record<string, unknown> | undefined,
			maybeSsecHeaders
		);
	}

	/**
	 * Retrieves an object as an in-memory Node.js Buffer.
	 */
	public async getObjectBuffer(key: string): Promise<Buffer | null> {
		const cleanKey = normalizeStorageKey(key, this.bucket);
		const arrayBuf = await super.getObjectArrayBuffer(cleanKey);
		if (!arrayBuf) {
			return null;
		}
		return Buffer.from(arrayBuf);
	}

	/**
	 * Retrieves an object as a Node.js Readable stream.
	 */
	public async getObjectStream(
		key: string
	): Promise<NodeJS.ReadableStream | null> {
		const cleanKey = normalizeStorageKey(key, this.bucket);
		const res = await super.getObjectResponse(cleanKey);
		if (!res || !res.body) {
			return null;
		}
		if (typeof Readable.fromWeb === "function") {
			return Readable.fromWeb(res.body as any);
		}
		return res.body as unknown as NodeJS.ReadableStream;
	}

	/**
	 * Retrieves an object and parses it as JSON.
	 */
	public override async getObjectJSON<T = unknown>(
		key: string,
		opts?: Record<string, unknown>,
		ssecHeaders?: SSECHeaders
	): Promise<T | null> {
		const cleanKey = normalizeStorageKey(key, this.bucket);
		return super.getObjectJSON<T>(cleanKey, opts, ssecHeaders);
	}

	/**
	 * Checks if an object exists in the bucket.
	 */
	public async exists(key: string): Promise<boolean> {
		const cleanKey = normalizeStorageKey(key, this.bucket);
		const res = await this.objectExists(cleanKey);
		return res === true;
	}

	/**
	 * Deletes a single object from the bucket.
	 */
	public override deleteObject(
		target: string | DeleteObject
	): Promise<boolean>;
	public override deleteObject(
		target: string | DeleteObject,
		options: { versionInfo: true }
	): Promise<DeleteObjectResult>;
	public override async deleteObject(
		target: string | DeleteObject,
		options?: { versionInfo?: boolean }
	): Promise<boolean | DeleteObjectResult> {
		const cleanTarget =
			typeof target === "string"
				? normalizeStorageKey(target, this.bucket)
				: {
						...target,
						key: normalizeStorageKey(target.key, this.bucket),
					};

		if (options?.versionInfo) {
			return super.deleteObject(cleanTarget, { versionInfo: true });
		}
		return super.deleteObject(cleanTarget);
	}

	/**
	 * Deletes multiple objects in batch.
	 */
	public override deleteObjects(
		targets: Array<string | DeleteObject>
	): Promise<boolean[]>;
	public override deleteObjects(
		targets: Array<string | DeleteObject>,
		options: { versionInfo: true }
	): Promise<DeleteObjectResult[]>;
	public override async deleteObjects(
		targets: Array<string | DeleteObject>,
		options?: { versionInfo?: boolean }
	): Promise<boolean[] | DeleteObjectResult[]> {
		if (!targets || targets.length === 0) {
			return [];
		}

		const cleanTargets = targets.map((t) =>
			typeof t === "string"
				? normalizeStorageKey(t, this.bucket)
				: { ...t, key: normalizeStorageKey(t.key, this.bucket) }
		);

		if (options?.versionInfo) {
			return super.deleteObjects(cleanTargets, { versionInfo: true });
		}
		return super.deleteObjects(cleanTargets);
	}

	/**
	 * Batch deletion returning aggregated deleted keys and errors.
	 */
	public async deleteBatch(
		targets: Array<string | DeleteObject>
	): Promise<DeleteBatchResult> {
		if (!targets || targets.length === 0) {
			return { deleted: [], errors: [] };
		}
		const results = await this.deleteObjects(targets, {
			versionInfo: true,
		});
		const deleted: string[] = [];
		const errors: Array<{ key: string; message?: string }> = [];

		for (const res of results) {
			if (res.deleted) {
				deleted.push(res.key);
			} else {
				errors.push({ key: res.key, message: "Deletion unsuccessful" });
			}
		}

		return { deleted, errors };
	}

	/**
	 * Purges all keys under a given prefix.
	 */
	public async purgePrefix(
		prefix: string,
		_options?: Record<string, unknown>
	): Promise<DeleteBatchResult> {
		const cleanPrefix = normalizeStorageKey(prefix, this.bucket);
		const objects = await super.listObjects("/", cleanPrefix);
		if (!objects || objects.length === 0) {
			return { deleted: [], errors: [] };
		}
		const keys = objects.map((o) => o.Key);
		return this.deleteBatch(keys);
	}

	/**
	 * Generates a pre-signed URL for direct client access.
	 * Overloaded to support both `(method, key, expiresIn, ...)` and `(key, options)`.
	 */
	public override getPresignedUrl(
		method: "GET" | "PUT",
		key: string,
		expiresIn?: number,
		queryParams?: Record<string, string>,
		headers?: Record<string, string>
	): Promise<string>;
	public override getPresignedUrl(
		key: string,
		options?: PresignedUrlOptions
	): Promise<string>;
	public override async getPresignedUrl(
		methodOrKey: string,
		keyOrOptions?: string | PresignedUrlOptions,
		maybeExpiresIn?: number,
		maybeQueryParams?: Record<string, string>,
		maybeHeaders?: Record<string, string>
	): Promise<string> {
		if (
			typeof methodOrKey === "string" &&
			(methodOrKey === "GET" || methodOrKey === "PUT") &&
			typeof keyOrOptions === "string"
		) {
			const cleanKey = normalizeStorageKey(keyOrOptions, this.bucket);
			return super.getPresignedUrl(
				methodOrKey,
				cleanKey,
				maybeExpiresIn,
				maybeQueryParams,
				maybeHeaders
			);
		}

		const key = methodOrKey;
		const options = (
			typeof keyOrOptions === "object" ? keyOrOptions : {}
		) as PresignedUrlOptions;
		const cleanKey = normalizeStorageKey(key, this.bucket);
		const method = options.method ?? "GET";
		const expiresIn = options.expiresIn ?? options.expiresInSeconds ?? 900;

		const headers: Record<string, string> = { ...(options.headers ?? {}) };
		if (options.contentType) {
			headers["Content-Type"] = options.contentType;
		}
		if (options.contentLength !== undefined) {
			headers["Content-Length"] = String(options.contentLength);
		}

		return super.getPresignedUrl(
			method,
			cleanKey,
			expiresIn,
			options.queryParams,
			headers
		);
	}

	/**
	 * Generates a short-lived pre-signed download URL.
	 */
	public async createPresignedDownloadUrl(params: {
		key: string;
		expiresInSeconds?: number;
	}): Promise<string> {
		return this.getPresignedUrl(params.key, {
			method: "GET",
			expiresIn: params.expiresInSeconds ?? 900,
		});
	}

	/**
	 * Generates a short-lived pre-signed upload URL.
	 */
	public async createPresignedUploadUrl(params: {
		key: string;
		contentType?: string;
		contentLength?: number;
		expiresInSeconds?: number;
	}): Promise<string> {
		return this.getPresignedUrl(params.key, {
			method: "PUT",
			contentType: params.contentType,
			contentLength: params.contentLength,
			expiresIn: params.expiresInSeconds ?? 900,
		});
	}

	/**
	 * Resolves the public URL for an S3 / Cloudflare R2 object.
	 */
	public getPublicUrl(
		key: string,
		options?: Partial<GetObjectPublicUrlOptions>
	): string {
		const customDomainUrl =
			this.customDomain ??
			(this.publicDomain
				? `${this.publicProtocol}//${this.publicDomain}`
				: undefined);

		return getObjectPublicUrl(key, {
			customDomain: customDomainUrl,
			endpoint: this.endpoint,
			bucket: this.bucket,
			region: this.region,
			...options,
		});
	}

	/**
	 * Alias for {@link getPublicUrl}.
	 */
	public getObjectPublicUrl(
		key: string,
		options?: Partial<GetObjectPublicUrlOptions>
	): string {
		return this.getPublicUrl(key, options);
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

export {
	runInBatches,
	sanitizeETag,
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
