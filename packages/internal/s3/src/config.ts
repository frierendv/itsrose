import type { Logger } from "s3mini";

/**
 * Configuration options for S3 / Cloudflare R2 / MinIO connection options.
 */
export interface S3Config {
	/**
	 * Access Key ID for authentication.
	 */
	accessKeyId?: string;

	/**
	 * Secret Access Key for authentication.
	 */
	secretAccessKey?: string;

	/**
	 * Endpoint URL (e.g. `https://s3.us-east-1.amazonaws.com`, `https://<account>.r2.cloudflarestorage.com`, or `http://localhost:9000`).
	 */
	endpoint?: string | URL;

	/**
	 * Target S3 region. Defaults to `"auto"` for R2/MinIO or `"us-east-1"` for AWS.
	 */
	region?: string;

	/**
	 * Target bucket name. If omitted, will be extracted from endpoint if present.
	 */
	bucket?: string;

	/**
	 * Alias for {@link bucket}.
	 */
	bucketName?: string;

	/**
	 * Cloudflare R2 custom domain or public CDN domain (e.g. `https://pub-cdn.itsrose.net`).
	 * Directly maps to bucket root without bucket name in path.
	 */
	customDomain?: string;

	/**
	 * Alias for {@link customDomain}.
	 */
	publicCdnUrl?: string;

	/**
	 * Domain for public asset serving (e.g. Cloudflare R2 custom domain, CloudFront, or `r2.dev`).
	 */
	publicDomain?: string;

	/**
	 * Default folder prefix used when creating keys (defaults to `"t"`).
	 */
	defaultPrefix?: string;

	/**
	 * Request payload chunk size in bytes for s3mini multipart uploads.
	 */
	requestSizeInBytes?: number;

	/**
	 * Request timeout in milliseconds for s3mini operations.
	 */
	requestAbortTimeout?: number;

	/**
	 * Minimum part size in bytes for multipart uploads.
	 */
	minPartSize?: number;

	/**
	 * Optional custom logger instance.
	 */
	logger?: Logger;

	/**
	 * Optional custom fetch function override.
	 */
	fetch?: typeof fetch;
}

export const TEMP_KEY = "t" as const;
export const PUBLIC_KEY = "public" as const;

/**
 * Extracts the bucket name from endpoint URL hostname or pathname.
 */
export function extractBucketName(
	endpointUrl: URL | string
): string | undefined {
	const url =
		typeof endpointUrl === "string" ? new URL(endpointUrl) : endpointUrl;
	const hostname = url.hostname.toLowerCase();
	const pathParts = url.pathname.split("/").filter(Boolean);

	// Cloudflare R2 (https://<accountid>.r2.cloudflarestorage.com/<bucket>)
	if (
		hostname.endsWith(".r2.cloudflarestorage.com") &&
		pathParts.length > 0
	) {
		return pathParts[0];
	}

	// AWS S3 virtual-host style: <bucket>.s3.<region>.amazonaws.com
	if (hostname.endsWith(".amazonaws.com")) {
		const parts = hostname.split(".");
		if (parts.length >= 4 && parts[0] !== "s3") {
			return parts[0];
		}
		if (pathParts.length > 0) {
			return pathParts[0];
		}
	}

	// Path-style endpoint (MinIO / LocalStack / generic): http://localhost:9000/<bucket>
	if (pathParts.length > 0) {
		return pathParts[0];
	}

	// Fallback to first hostname segment if not standard s3
	const firstSub = hostname.split(".")[0];
	if (
		firstSub &&
		firstSub !== "s3" &&
		firstSub !== "localhost" &&
		!/^\d+$/.test(firstSub)
	) {
		return firstSub;
	}

	return undefined;
}

/**
 * Normalizes an endpoint URL ensuring it carries the bucket name as required by s3mini.
 */
export function resolveS3miniEndpoint(
	rawEndpoint: string | URL,
	bucket?: string
): string {
	const rawStr =
		typeof rawEndpoint === "string"
			? rawEndpoint.trim()
			: rawEndpoint.toString();
	const hasProto = /^https?:\/\//i.test(rawStr);
	const validUrlStr = hasProto ? rawStr : `https://${rawStr}`;
	const url = new URL(validUrlStr);

	const cleanBucket = bucket ? bucket.trim().replace(/^\/+|\/+$/g, "") : "";
	if (!cleanBucket) {
		return url.toString().replace(/\/+$/, "");
	}

	// Check if bucket is already in path
	const pathParts = url.pathname.split("/").filter(Boolean);
	if (pathParts[0] === cleanBucket) {
		return url.toString().replace(/\/+$/, "");
	}

	// Check if bucket is already in host
	const hostParts = url.hostname.split(".");
	if (hostParts[0] === cleanBucket) {
		return url.toString().replace(/\/+$/, "");
	}

	// AWS S3 virtual-hosted style endpoint
	if (
		url.hostname.endsWith(".amazonaws.com") &&
		!url.hostname.startsWith(`${cleanBucket}.`)
	) {
		url.hostname = `${cleanBucket}.${url.hostname}`;
		return url.toString().replace(/\/+$/, "");
	}

	// Append bucket to pathname for path-style endpoints (R2, MinIO, etc.)
	const cleanPath = url.pathname.replace(/^\/+|\/+$/g, "");
	url.pathname = cleanPath
		? `/${cleanPath}/${cleanBucket}`
		: `/${cleanBucket}`;
	return url.toString().replace(/\/+$/, "");
}

/**
 * Normalizes a public domain string, stripping trailing slashes and extra protocol prefixes.
 */
export function normalizePublicDomain(rawDomain?: string): {
	domain?: string;
	protocol: string;
} {
	if (!rawDomain) {
		return { domain: undefined, protocol: "https:" };
	}

	const trimmed = rawDomain.trim();
	let protocol = "https:";
	if (/^https?:\/\//i.test(trimmed)) {
		protocol = trimmed.toLowerCase().startsWith("http://")
			? "http:"
			: "https:";
	}

	const domain = trimmed
		.replace(/^https?:\/\//i, "")
		.replace(/^\/+|\/+$/g, "");

	return { domain: domain || undefined, protocol };
}
