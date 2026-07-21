import { runInNewContext } from "vm";

/**
 * Extracts the payload passed to an eval function within a given script body.
 * @param scriptBody - The JavaScript code containing an eval call.
 * @returns The payload passed to the eval function, or null if not found or an error occurs.
 */
export function extractEvalPayload(scriptBody: string): string | null {
	const sandbox: Record<string, unknown> & { capturedPayload: string } = {
		capturedPayload: "",
		window: {},
		document: {
			getElementById: () => ({ innerHTML: "" }),
			querySelector: () => ({ innerHTML: "" }),
			write: () => undefined,
		},
		navigator: {},
		location: {},
		atob: (i: string) => Buffer.from(i, "base64").toString("binary"),
	};

	sandbox.eval = (arg: unknown) => {
		if (typeof arg === "string") {
			sandbox.capturedPayload = arg;
		}
		return arg;
	};

	try {
		runInNewContext(scriptBody, sandbox, { timeout: 500 });
		return sandbox.capturedPayload || null;
	} catch (_error) {
		return null;
	}
}
/**
 * Decodes a Base64-encoded string that has been modified for URL safety.
 * @param value - The Base64-encoded string to decode.
 * @returns The decoded string.
 */
export function decodeUrlSafeBase64(value: string): string {
	let normalized = value.replace(/-/g, "+").replace(/_/g, "/");
	while (normalized.length % 4 !== 0) {
		normalized += "=";
	}
	return Buffer.from(normalized, "base64").toString("utf-8");
}
/**
 * Retrieves the value of a specified query parameter from a given source string.
 * @param source - The source string containing the query parameters.
 * @param key - The key of the query parameter to retrieve.
 * @returns The value of the specified query parameter, or null if not found.
 */
export function getQueryParam(
	source: string | undefined,
	key: string
): string | null {
	if (!source || !source.includes("?")) {
		return null;
	}
	const query = source.slice(source.indexOf("?") + 1);
	return new URLSearchParams(query).get(key);
}

/**
 * Safely decodes a URI component, returning the original value if decoding fails.
 * @param value - The URI component to decode.
 * @returns The decoded URI component or the original value if decoding fails.
 */
export function safeDecodeURIComponent(value: string): string {
	try {
		return decodeURIComponent(value);
	} catch {
		return value;
	}
}

/**
 * Tries to decode a tokenized URL using a specified query parameter key (default is "token").
 * If the token is present and can be decoded, it returns the decoded URL;
 * otherwise, it returns the original URI.
 * @param uri - The URI to decode.
 * @param tKey - The query parameter key to look for the token (default is "token").
 * @returns The decoded URL or the original URI if decoding fails.
 */
export function decodeTokenizedUri(uri: string, tKey = "token"): string {
	const token = getQueryParam(uri, tKey);
	if (!token) {
		return uri;
	}
	try {
		const [, payload] = token.split(".");
		if (!payload) {
			return uri;
		}
		const decoded = JSON.parse(decodeUrlSafeBase64(payload));
		return typeof decoded.url === "string" ? decoded.url : uri;
	} catch {
		return uri;
	}
}

/**
 * Determines if a given URL points to a video file based on its extension or token payload.
 * @param url - The URL to check.
 * @returns True if the URL points to a video file, false otherwise.
 */
export function isVideoUrl(url: string): boolean {
	const normalized = url.toLowerCase();
	if (
		normalized.includes(".jpg") ||
		normalized.includes(".jpeg") ||
		normalized.includes(".png")
	) {
		return false;
	}
	if (normalized.includes(".mp4")) {
		return true;
	}
	const token = getQueryParam(url, "token");
	if (!token) {
		return normalized.includes(".mp4");
	}
	try {
		const [, payload] = token.split(".");
		if (!payload) {
			return normalized.includes(".mp4");
		}
		return decodeUrlSafeBase64(payload).includes(".mp4");
	} catch (_error) {
		return normalized.includes(".mp4");
	}
}
