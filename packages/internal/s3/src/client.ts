import {
	DeleteObjectCommand,
	DeleteObjectsCommand,
	GetObjectCommand,
	ListObjectsV2Command,
	PutObjectCommand,
	S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { StorageConfigError } from "./errors";
import { detectMimeType } from "./mime";
import type {
	DeleteResult,
	PresignedUploadOptions,
	StorageClientConfig,
	StorageObject,
	UploadOptions,
	UploadResult,
} from "./types";
import { resolveKey, toBuffer } from "./utils";

const R2_REGION = "auto" as const;
const R2_ENDPOINT_SUFFIX = ".r2.cloudflarestorage.com" as const;
const DEFAULT_PRESIGNED_URL_EXPIRES_IN = 3600;
const MAX_BATCH_DELETE_KEYS = 1000;

/**
 * Trims and validates a required configuration string.
 */
function assertPresent(value: string | undefined, name: string): string {
	const trimmed = value?.trim();
	if (!trimmed) {
		throw new StorageConfigError(`"${name}" is required.`);
	}
	return trimmed;
}

/**
 * Normalizes a public domain into an absolute base URL (defaulting to HTTPS).
 */
function normalizePublicDomain(domain?: string): string | undefined {
	const trimmed = domain?.trim();
	if (!trimmed) {
		return undefined;
	}

	const withProtocol = /^https?:\/\//i.test(trimmed)
		? trimmed
		: `https://${trimmed}`;

	return withProtocol.replace(/\/+$/, "");
}

/**
 * Modern, ergonomic storage client optimized for Cloudflare R2, built on the
 * standard AWS SDK for JavaScript v3.
 */
export class StorageClient {
	/** Cloudflare account ID. */
	readonly accountId: string;

	/** Target bucket name. */
	readonly bucket: string;

	/** Global key prefix applied to every object key. */
	readonly keyPrefix?: string;

	/** Normalized public base URL (e.g. `https://cdn.myapp.com`), when configured. */
	readonly publicDomain?: string;

	/** R2 S3 API endpoint. */
	readonly endpoint: string;

	private readonly client: S3Client;

	constructor(config: StorageClientConfig) {
		const accountId = assertPresent(config.accountId, "accountId");
		const accessKeyId = assertPresent(config.accessKeyId, "accessKeyId");
		const secretAccessKey = assertPresent(
			config.secretAccessKey,
			"secretAccessKey"
		);
		const bucket = assertPresent(config.bucket, "bucket");

		this.accountId = accountId;
		this.bucket = bucket;
		this.keyPrefix = config.keyPrefix?.trim() || undefined;
		this.publicDomain = normalizePublicDomain(config.publicDomain);
		this.endpoint = `https://${accountId}${R2_ENDPOINT_SUFFIX}`;

		this.client = new S3Client({
			region: R2_REGION,
			endpoint: this.endpoint,
			credentials: {
				accessKeyId,
				secretAccessKey,
			},
		});
	}

	/**
	 * Uploads an object to R2. Accepts a `Buffer` or a base64 string, and
	 * auto-detects the content type when none is provided.
	 */
	async upload(
		key: string,
		data: Buffer | string,
		options: UploadOptions = {}
	): Promise<UploadResult> {
		const body = toBuffer(data);
		const resolvedKey = resolveKey(this.keyPrefix, key);
		const contentType =
			options.contentType?.trim() || (await detectMimeType(body));

		const response = await this.client.send(
			new PutObjectCommand({
				Bucket: this.bucket,
				Key: resolvedKey,
				Body: body,
				ContentType: contentType,
				...(options.cacheControl
					? { CacheControl: options.cacheControl }
					: {}),
				...(options.metadata ? { Metadata: options.metadata } : {}),
			})
		);

		const url = this.buildPublicUrl(resolvedKey);
		return {
			key: resolvedKey,
			...(url ? { url } : {}),
			...(response?.ETag ? { etag: response.ETag } : {}),
		};
	}

	/**
	 * Downloads an object from R2 as an in-memory Buffer.
	 */
	async download(key: string): Promise<Buffer> {
		const resolvedKey = resolveKey(this.keyPrefix, key);

		const response = await this.client.send(
			new GetObjectCommand({ Bucket: this.bucket, Key: resolvedKey })
		);

		const bytes = await response.Body?.transformToByteArray();
		return Buffer.from(bytes ?? []);
	}

	/**
	 * Deletes an object from R2.
	 */
	async delete(key: string): Promise<void> {
		const resolvedKey = resolveKey(this.keyPrefix, key);

		await this.client.send(
			new DeleteObjectCommand({ Bucket: this.bucket, Key: resolvedKey })
		);
	}

	/**
	 * Lists objects in the bucket, optionally scoped to a prefix.
	 */
	async listObjects(prefix?: string): Promise<StorageObject[]> {
		const resolvedPrefix = prefix
			? resolveKey(this.keyPrefix, prefix)
			: undefined;
		return this.listObjectsResolved(resolvedPrefix);
	}

	/**
	 * Deletes every object under a prefix, returning the deleted keys and any errors.
	 */
	async purgePrefix(prefix: string): Promise<DeleteResult> {
		const resolvedPrefix = resolveKey(this.keyPrefix, prefix);
		const objects = await this.listObjectsResolved(resolvedPrefix);
		const keys = objects.map((object) => object.key);

		if (keys.length === 0) {
			return { deleted: [], errors: [] };
		}

		const deleted: string[] = [];
		const errors: DeleteResult["errors"] = [];

		for (
			let index = 0;
			index < keys.length;
			index += MAX_BATCH_DELETE_KEYS
		) {
			const batch = keys.slice(index, index + MAX_BATCH_DELETE_KEYS);
			const response = await this.client.send(
				new DeleteObjectsCommand({
					Bucket: this.bucket,
					Delete: {
						Objects: batch.map((key) => ({ Key: key })),
					},
				})
			);

			for (const entry of response.Deleted ?? []) {
				if (entry.Key) {
					deleted.push(entry.Key);
				}
			}

			for (const entry of response.Errors ?? []) {
				errors.push({
					key: entry.Key ?? "",
					code: entry.Code,
					message: entry.Message,
				});
			}
		}

		return { deleted, errors };
	}

	/**
	 * Resolves the public URL for an object, or `null` when no `publicDomain`
	 * is configured.
	 */
	getPublicUrl(key: string): string | null {
		return this.buildPublicUrl(resolveKey(this.keyPrefix, key));
	}

	/**
	 * Generates a short-lived pre-signed GET (download) URL for an object.
	 */
	async getPresignedUrl(
		key: string,
		expiresIn: number = DEFAULT_PRESIGNED_URL_EXPIRES_IN
	): Promise<string> {
		const resolvedKey = resolveKey(this.keyPrefix, key);

		return getSignedUrl(
			this.client,
			new GetObjectCommand({ Bucket: this.bucket, Key: resolvedKey }),
			{ expiresIn }
		);
	}

	/**
	 * Generates a short-lived pre-signed PUT (upload) URL for an object.
	 */
	async getPresignedUploadUrl(
		key: string,
		options: PresignedUploadOptions = {}
	): Promise<string> {
		const resolvedKey = resolveKey(this.keyPrefix, key);

		return getSignedUrl(
			this.client,
			new PutObjectCommand({
				Bucket: this.bucket,
				Key: resolvedKey,
				...(options.contentType
					? { ContentType: options.contentType }
					: {}),
			}),
			{ expiresIn: options.expiresIn ?? DEFAULT_PRESIGNED_URL_EXPIRES_IN }
		);
	}

	/**
	 * Builds a public URL from an already-resolved key.
	 */
	private buildPublicUrl(resolvedKey: string): string | null {
		if (!this.publicDomain) {
			return null;
		}
		return `${this.publicDomain}/${resolvedKey}`;
	}

	/**
	 * Lists objects using an already-resolved prefix, following pagination.
	 */
	private async listObjectsResolved(
		prefix?: string
	): Promise<StorageObject[]> {
		const objects: StorageObject[] = [];
		let continuationToken: string | undefined;

		do {
			const response = await this.client.send(
				new ListObjectsV2Command({
					Bucket: this.bucket,
					...(prefix ? { Prefix: prefix } : {}),
					...(continuationToken
						? { ContinuationToken: continuationToken }
						: {}),
				})
			);

			for (const item of response.Contents ?? []) {
				if (item.Key) {
					objects.push({
						key: item.Key,
						size: item.Size,
						lastModified: item.LastModified,
						etag: item.ETag,
					});
				}
			}

			continuationToken = response.IsTruncated
				? response.NextContinuationToken
				: undefined;
		} while (continuationToken);

		return objects;
	}
}
