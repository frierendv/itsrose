import { S3ValidationError } from "./errors";

export interface GetObjectPublicUrlOptions {
	/**
	 * Storage key relative to bucket root (e.g., `t/artifacts/export.csv`).
	 */
	key: string;

	/**
	 * Target S3 / R2 bucket name.
	 */
	bucket?: string;

	/**
	 * Cloudflare R2 custom domain or public CDN domain (e.g., `https://pub-cdn.itsrose.net`).
	 * When present, mapped directly to bucket root: keys resolve as `https://customDomain/{key}`
	 * without duplicate or omitted bucket prefixes.
	 */
	customDomain?: string;

	/**
	 * Alias for {@link customDomain}.
	 */
	publicCdnUrl?: string;

	/**
	 * Alias for {@link customDomain}.
	 */
	publicDomain?: string;

	/**
	 * S3 API endpoint URL (e.g., `https://<account_id>.r2.cloudflarestorage.com`, `https://endpoint.com`).
	 */
	endpoint?: string | URL;

	/**
	 * Target S3 region (defaults to `"auto"` or `"us-east-1"`).
	 */
	region?: string;

	/**
	 * Whether to force path-style access.
	 */
	forcePathStyle?: boolean;
}

/**
 * Normalizes a storage key to be strictly relative to the bucket root.
 * Trims whitespace, eliminates duplicate or leading/trailing slashes,
 * resolves path-traversal sequences (`..`), and removes any accidental bucket name prefix.
 */
export function normalizeStorageKey(key: string, bucket?: string): string {
	if (!key || typeof key !== "string") {
		throw new S3ValidationError("Storage key cannot be empty.");
	}

	const normalized = key.trim().replace(/\\+/g, "/");

	// Canonical segment traversal resolution
	const rawSegments = normalized.split("/");
	const segments: string[] = [];

	for (const segment of rawSegments) {
		if (segment === "" || segment === ".") {
			continue;
		}
		if (segment === "..") {
			segments.pop();
		} else {
			segments.push(segment);
		}
	}

	let cleanKey = segments.join("/");

	if (!cleanKey) {
		throw new S3ValidationError("Storage key cannot be empty.");
	}

	if (bucket) {
		const cleanBucket = bucket.trim().replace(/^\/+|\/+$/g, "");
		if (
			cleanBucket &&
			(cleanKey === cleanBucket || cleanKey.startsWith(`${cleanBucket}/`))
		) {
			cleanKey = cleanKey
				.slice(cleanBucket.length)
				.replace(/^\/+|\/+$/g, "");
			if (!cleanKey) {
				throw new S3ValidationError("Storage key cannot be empty.");
			}
		}
	}

	return cleanKey;
}

/**
 * Normalizes a custom domain or CDN URL string.
 * Ensures a valid protocol (defaults to `https:`) and trailing slash for `new URL(path, base)` resolution.
 */
function normalizeBaseUrl(domainOrUrl: string): string {
	const trimmed = domainOrUrl.trim();
	const hasProtocol = /^https?:\/\//i.test(trimmed);
	const fullUrl = hasProtocol ? trimmed : `https://${trimmed}`;
	return fullUrl.endsWith("/") ? fullUrl : `${fullUrl}/`;
}

/**
 * Resolves the public URL for an S3 / Cloudflare R2 object.
 *
 * Handles Cloudflare R2's domain binding dichotomy:
 * 1. **Custom Domain / Public CDN Domain** (`https://pub-cdn.itsrose.net`):
 *    Mapped directly to bucket root. Resolves strictly as `https://pub-cdn.itsrose.net/{key}`.
 *    Any accidental bucket prefix is omitted to prevent 404s.
 * 2. **S3 API Endpoint / Path-Style** (`https://<account_id>.r2.cloudflarestorage.com` or `https://endpoint.com`):
 *    Requires the bucket name in the path: `https://endpoint.com/{bucket}/{key}`.
 *
 * @example
 * // With custom domain
 * getObjectPublicUrl({ key: "t/artifacts/export.csv", customDomain: "https://pub-cdn.itsrose.net" });
 * // => "https://pub-cdn.itsrose.net/t/artifacts/export.csv"
 *
 * // Without custom domain (path-style)
 * getObjectPublicUrl({ key: "t/artifacts/export.csv", bucket: "my-bucket", endpoint: "https://endpoint.com" });
 * // => "https://endpoint.com/my-bucket/t/artifacts/export.csv"
 */
export function getObjectPublicUrl(options: GetObjectPublicUrlOptions): string;
export function getObjectPublicUrl(
	key: string,
	options?: Partial<GetObjectPublicUrlOptions>
): string;
export function getObjectPublicUrl(
	keyOrOptions: string | GetObjectPublicUrlOptions,
	maybeOptions?: Partial<GetObjectPublicUrlOptions>
): string {
	const opts: GetObjectPublicUrlOptions =
		typeof keyOrOptions === "string"
			? { key: keyOrOptions, ...(maybeOptions ?? {}) }
			: keyOrOptions;

	const {
		key,
		bucket,
		customDomain: explicitCustomDomain,
		publicCdnUrl,
		publicDomain,
		endpoint,
		region,
		forcePathStyle,
	} = opts;

	const cleanKey = normalizeStorageKey(key, bucket);
	const cleanBucket = bucket ? bucket.trim().replace(/^\/+|\/+$/g, "") : "";

	const customDomain = explicitCustomDomain ?? publicCdnUrl ?? publicDomain;

	// R2 Custom Domain / Public Bucket Domain (direct bucket root mapping)
	if (customDomain && customDomain.trim().length > 0) {
		const base = normalizeBaseUrl(customDomain);
		return new URL(cleanKey, base).toString();
	}

	// Endpoint resolution (AWS S3 virtual-hosted vs. path-style endpoints)
	if (endpoint) {
		const endpointStr =
			typeof endpoint === "string"
				? endpoint.trim()
				: endpoint.toString();
		const base = normalizeBaseUrl(endpointStr);
		const endpointUrl = new URL(base);
		const hostname = endpointUrl.hostname.toLowerCase();

		// Standard AWS S3 virtual-host style (bucket in subdomain)
		if (hostname.endsWith(".amazonaws.com") && !forcePathStyle) {
			if (cleanBucket) {
				const regionStr =
					region && region !== "auto" ? `.${region}` : "";
				return `https://${cleanBucket}.s3${regionStr}.amazonaws.com/${cleanKey}`;
			}
			return new URL(cleanKey, base).toString();
		}

		// Path-style S3 / Cloudflare R2 API endpoint (endpoint.com/{bucket}/{key})
		const endpointPath = endpointUrl.pathname.replace(/^\/+|\/+$/g, "");
		const pathSegments = endpointPath ? endpointPath.split("/") : [];
		const lastSegment = pathSegments[pathSegments.length - 1];

		if (cleanBucket && lastSegment !== cleanBucket) {
			return new URL(`${cleanBucket}/${cleanKey}`, base).toString();
		}

		return new URL(cleanKey, base).toString();
	}

	// 3. Fallback when only bucket name is provided (standard S3 default)
	if (cleanBucket) {
		const regionStr = region && region !== "auto" ? `.${region}` : "";
		return `https://${cleanBucket}.s3${regionStr}.amazonaws.com/${cleanKey}`;
	}

	throw new S3ValidationError(
		"Cannot resolve public URL: either customDomain, endpoint, or bucket must be configured."
	);
}

/**
 * Alias for {@link getObjectPublicUrl}.
 */
export const getPublicUrl = getObjectPublicUrl;
