import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod/v4";
import {
	WebhookCallbackSchema,
	WebhookSignatureHeadersSchema,
} from "../zod-schema";
import type { WebhookCallback } from "../zod-schema";

/**
 * How old a callback may be before it is rejected, in seconds.
 *
 * PixVerse recommends rejecting timestamps outside a five-minute window to
 * reduce replay risk.
 */
export const PIXVERSE_WEBHOOK_TOLERANCE_SECONDS = 300;

/**
 * A callback the caller wants verified.
 */
export interface VerifyWebhookInput {
	/**
	 * The request headers. Only the three signing headers are read, so the
	 * headers can be passed through as they came.
	 */
	headers: Record<string, string | string[] | undefined>;

	/**
	 * The request body, exactly as it was received.
	 */
	body: unknown;

	/**
	 * The secret key of the webhook, as registered in the PixVerse console.
	 */
	secret: string;

	/**
	 * Current time, in milliseconds since the epoch. Injectable so the
	 * freshness check can be tested.
	 * @default Date.now()
	 */
	now?: number;
}

/**
 * Flattens a header value that may have been received more than once.
 *
 * @param value The header value.
 * @returns The first value, or `undefined`.
 */
function firstHeader(value: string | string[] | undefined): string | undefined {
	return Array.isArray(value) ? value[0] : value;
}

/**
 * Reads the signing headers out of a header map.
 *
 * What the canonical string is built from is the raw body, so the body is
 * not normalized here: only the headers are looked up, case-insensitively.
 *
 * @param headers The request headers.
 * @returns The signing headers, or `undefined` when one is missing.
 */
export function readSignatureHeaders(
	headers: Record<string, string | string[] | undefined>
): z.infer<typeof WebhookSignatureHeadersSchema> | undefined {
	const normalized: Record<string, string | undefined> = {};

	for (const [name, value] of Object.entries(headers)) {
		normalized[name.toLowerCase()] = firstHeader(value);
	}

	const parsed = WebhookSignatureHeadersSchema.safeParse(normalized);

	return parsed.success ? parsed.data : undefined;
}

/**
 * Builds the string PixVerse signs a callback over.
 *
 * The payload is the callback's fields sorted by key, joined as `key=value`
 * with `&`, and each value URL-encoded.
 *
 * @param body The callback payload.
 * @returns The URL-encoded payload.
 */
export function buildSigningPayload(body: Record<string, unknown>): string {
	return Object.keys(body)
		.sort()
		.map(
			(key) =>
				`${encodeURIComponent(key)}=${encodeURIComponent(String(body[key]))}`
		)
		.join("&");
}

/**
 * Computes the signature of a callback.
 *
 * @param input The timestamp, nonce, body and secret of the callback.
 * @returns The Base64 encoded HMAC-SHA256 signature.
 */
export function computeWebhookSignature(input: {
	timestamp: string;
	nonce: string;
	body: Record<string, unknown>;
	secret: string;
}): string {
	const payload = buildSigningPayload(input.body);
	const signingString = `${input.timestamp}\n${input.nonce}\n${payload}`;

	return createHmac("sha256", input.secret)
		.update(signingString)
		.digest("base64");
}

/**
 * Verifies the signature of a PixVerse callback and returns its payload.
 *
 * The check is on the signature first and on its age second, and the
 * comparison is timing-safe. A callback that carried nested objects cannot
 * be canonicalized the way PixVerse documents it, so such a callback is
 * treated as unverifiable rather than accepted.
 *
 * @param input The headers, the body and the webhook secret.
 * @returns The verified callback payload, or `undefined` when the callback
 * could not be verified.
 */
export function verifyWebhookSignature(
	input: VerifyWebhookInput
): WebhookCallback | undefined {
	const headers = readSignatureHeaders(input.headers);

	if (!headers || !input.body || typeof input.body !== "object") {
		return undefined;
	}

	const body = input.body as Record<string, unknown>;

	// nested values have no documented canonical form
	if (
		Object.values(body).some(
			(value) => typeof value === "object" && value !== null
		)
	) {
		return undefined;
	}

	const expected = computeWebhookSignature({
		timestamp: headers["webhook-timestamp"],
		nonce: headers["webhook-nonce"],
		body,
		secret: input.secret,
	});

	const received = headers["webhook-signature"];
	const expectedBuffer = Buffer.from(expected, "utf8");
	const receivedBuffer = Buffer.from(received, "utf8");

	if (
		expectedBuffer.length !== receivedBuffer.length ||
		!timingSafeEqual(expectedBuffer, receivedBuffer)
	) {
		return undefined;
	}

	const timestamp = Number(headers["webhook-timestamp"]);
	const now = input.now ?? Date.now();

	if (
		!Number.isFinite(timestamp) ||
		Math.abs(now / 1000 - timestamp) > PIXVERSE_WEBHOOK_TOLERANCE_SECONDS
	) {
		return undefined;
	}

	const parsed = WebhookCallbackSchema.safeParse(body);

	return parsed.success ? parsed.data : undefined;
}
