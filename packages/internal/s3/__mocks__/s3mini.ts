export class S3mini {
	readonly endpoint: URL;
	readonly region: string;
	readonly bucketName: string;
	readonly requestSizeInBytes: number = 8388608;
	readonly minPartSize: number = 8388608;

	constructor(config: {
		accessKeyId: string;
		secretAccessKey: string;
		endpoint: string;
		region?: string;
		requestSizeInBytes?: number;
		minPartSize?: number;
	}) {
		this.endpoint = new URL(config.endpoint);
		this.region = config.region ?? "auto";
		this.bucketName = this._extractBucketName(this.endpoint);
	}

	private _extractBucketName(endpoint: URL): string {
		const host = endpoint.hostname;
		const pathParts = endpoint.pathname.split("/").filter(Boolean);
		if (
			host.includes(".s3.") ||
			host.endsWith(".amazonaws.com") ||
			host.includes(".r2.cloudflarestorage.com")
		) {
			const sub = host.split(".")[0];
			if (sub && sub !== "s3") {
				return sub;
			}
		}
		if (pathParts.length > 0) {
			return pathParts[pathParts.length - 1] ?? "bucket";
		}
		return host.split(".")[0] || "bucket";
	}

	async putObject(key: string, _data: unknown, fileType?: string) {
		return new Response(null, {
			status: 200,
			headers: { "content-type": fileType ?? "application/octet-stream" },
		});
	}

	async putAnyObject(key: string, _data: unknown, fileType?: string) {
		return {
			ok: true,
			status: 200,
			headers: new Map([
				["content-type", fileType ?? "application/octet-stream"],
			]),
		};
	}

	async objectExists(_key: string) {
		return true;
	}

	async getObject(_key: string) {
		return null;
	}

	async getObjectResponse(_key: string) {
		return new Response(null, { status: 200 });
	}

	async getObjectArrayBuffer(_key: string) {
		return new ArrayBuffer(0);
	}

	async getObjectJSON(_key: string) {
		return null;
	}

	async deleteObject(key: string | { key: string }) {
		const keyStr = typeof key === "string" ? key : key.key;
		return { key: keyStr, deleted: true };
	}

	async deleteObjects(targets: Array<string | { key: string }>) {
		return targets.map((t) => ({
			key: typeof t === "string" ? t : t.key,
			deleted: true,
		}));
	}

	async listObjects(_delimiter?: string, _prefix?: string) {
		return [];
	}

	async getPresignedUrl(
		method: string,
		key: string,
		_expiresIn?: number,
		_queryParams?: Record<string, string>,
		_headers?: Record<string, string>
	) {
		return `${this.endpoint.origin}/${this.bucketName}/${key}?X-Amz-Signature=mock&method=${method}`;
	}
}

export class S3Error extends Error {}
export class S3ServiceError extends S3Error {}
export class S3NetworkError extends S3Error {}
export function sanitizeETag(etag: string) {
	return etag.replace(/["'\s]/g, "");
}
export function runInBatches() {}
