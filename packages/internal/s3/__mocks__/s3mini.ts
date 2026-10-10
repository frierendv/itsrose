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

	async deleteObject(_key: string) {
		return { deleted: true };
	}
}

export class S3Error extends Error {}
export class S3ServiceError extends S3Error {}
export class S3NetworkError extends S3Error {}
export function sanitizeETag(etag: string) {
	return etag.replace(/["'\s]/g, "");
}
export function runInBatches() {}
