/**
 * Normalizes a path-like string into clean, slash-delimited segments.
 */
function normalizeSegment(value: string): string {
	return value.replace(/\\+/g, "/").split("/").filter(Boolean).join("/");
}

/**
 * Safely joins an optional key prefix and a key into a single S3 object key.
 *
 * Handles duplicate/leading/trailing slashes and guarantees the result never
 * starts with a leading slash (S3 object keys are relative to the bucket root).
 *
 * @example
 * resolveKey("app/assets", "avatar.png"); // => "app/assets/avatar.png"
 * resolveKey("assets/", "img.png");       // => "assets/img.png"
 * resolveKey(undefined, "avatar.png");    // => "avatar.png"
 */
export function resolveKey(prefix: string | undefined, key: string): string {
	const cleanPrefix = prefix ? normalizeSegment(prefix) : "";
	const cleanKey = normalizeSegment(key);

	return [cleanPrefix, cleanKey].filter(Boolean).join("/");
}

/**
 * Converts a base64 string into a Buffer, or returns a Buffer unchanged.
 *
 * Supports RFC 4648 URL-safe base64 and `data:` URLs (e.g. `data:image/png;base64,...`).
 *
 * @throws {TypeError} When `data` is neither a Buffer nor a string.
 */
export function toBuffer(data: Buffer | string): Buffer {
	if (Buffer.isBuffer(data)) {
		return data;
	}

	if (typeof data !== "string") {
		throw new TypeError(
			"data must be a Buffer or a base64-encoded string."
		);
	}

	let base64 = data.trim();

	const dataUrlMatch = base64.match(/^data:[^,]*;base64,([\s\S]*)$/i);
	if (dataUrlMatch?.[1]) {
		base64 = dataUrlMatch[1];
	}

	// Normalize URL-safe base64 (RFC 4648 §5).
	base64 = base64.replace(/-/g, "+").replace(/_/g, "/");

	return Buffer.from(base64, "base64");
}
