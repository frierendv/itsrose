import { createHmac } from "node:crypto";
import {
	computeWebhookSignature,
	PIXVERSE_WEBHOOK_TOLERANCE_SECONDS,
	verifyWebhookSignature,
} from "../src/webhook/verify-signature";

const SECRET = "whsec_test_secret";
const NONCE = "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6";

/**
 * The callback body from the PixVerse documentation.
 */
const BODY = {
	id: "123456789",
	status: 1,
	url: "https://example.com/video.mp4",
	has_audio: true,
};

/**
 * Signs a body exactly the way the documentation describes, without using
 * the implementation under test.
 *
 * @param timestamp The signing timestamp.
 * @param body The callback body.
 * @param secret The secret key.
 * @returns The Base64 encoded signature.
 */
function signIndependently(
	timestamp: string,
	body: Record<string, unknown>,
	secret = SECRET
): string {
	const payload = Object.keys(body)
		.sort()
		.map((key) => `${key}=${encodeURIComponent(String(body[key]))}`)
		.join("&");
	const signingString = `${timestamp}\n${NONCE}\n${payload}`;

	return createHmac("sha256", secret).update(signingString).digest("base64");
}

/**
 * Builds the headers PixVerse sends with a callback.
 *
 * @param signature The signature to send.
 * @param timestamp The timestamp to send.
 * @returns The headers.
 */
function headers(signature: string, timestamp: string) {
	return {
		"Webhook-Timestamp": timestamp,
		"Webhook-Nonce": NONCE,
		"Webhook-Signature": signature,
		"Ai-trace-id": "550e8400-e29b-41d4-a716-446655440000",
		"Content-Type": "application/json",
	};
}

describe("webhook", () => {
	const now = Date.UTC(2026, 10, 18, 4, 0, 0);
	const timestamp = String(Math.floor(now / 1000));

	describe("buildSigningPayload", () => {
		it("sorts the keys and url-encodes the values", async () => {
			const { buildSigningPayload } =
				await import("../src/webhook/verify-signature");

			expect(buildSigningPayload(BODY)).toBe(
				"has_audio=true&id=123456789&status=1&url=https%3A%2F%2Fexample.com%2Fvideo.mp4"
			);
		});
	});

	describe("computeWebhookSignature", () => {
		it("matches an independently computed HMAC", () => {
			expect(
				computeWebhookSignature({
					timestamp,
					nonce: NONCE,
					body: BODY,
					secret: SECRET,
				})
			).toBe(signIndependently(timestamp, BODY));
		});
	});

	describe("verifyWebhookSignature", () => {
		it("accepts a correctly signed, fresh callback", () => {
			const result = verifyWebhookSignature({
				headers: headers(signIndependently(timestamp, BODY), timestamp),
				body: BODY,
				secret: SECRET,
				now,
			});

			expect(result).toMatchObject({ id: "123456789", status: 1 });
		});

		it("rejects a tampered payload", () => {
			const result = verifyWebhookSignature({
				headers: headers(signIndependently(timestamp, BODY), timestamp),
				body: { ...BODY, status: 8 },
				secret: SECRET,
				now,
			});

			expect(result).toBeUndefined();
		});

		it("rejects a callback signed with another secret", () => {
			const result = verifyWebhookSignature({
				headers: headers(
					signIndependently(timestamp, BODY, "another_secret"),
					timestamp
				),
				body: BODY,
				secret: SECRET,
				now,
			});

			expect(result).toBeUndefined();
		});

		it("rejects a stale callback", () => {
			const stale =
				now - (PIXVERSE_WEBHOOK_TOLERANCE_SECONDS + 60) * 1000;
			const staleTimestamp = String(Math.floor(stale / 1000));

			const result = verifyWebhookSignature({
				headers: headers(
					signIndependently(staleTimestamp, BODY),
					staleTimestamp
				),
				body: BODY,
				secret: SECRET,
				now,
			});

			expect(result).toBeUndefined();
		});

		it("rejects a callback from the future beyond the window", () => {
			const future =
				now + (PIXVERSE_WEBHOOK_TOLERANCE_SECONDS + 60) * 1000;
			const futureTimestamp = String(Math.floor(future / 1000));

			const result = verifyWebhookSignature({
				headers: headers(
					signIndependently(futureTimestamp, BODY),
					futureTimestamp
				),
				body: BODY,
				secret: SECRET,
				now,
			});

			expect(result).toBeUndefined();
		});

		it("rejects a callback with a missing signing header", () => {
			const complete = headers(
				signIndependently(timestamp, BODY),
				timestamp
			);
			const withoutNonce: Record<string, string> = { ...complete };
			delete withoutNonce["Webhook-Nonce"];

			expect(
				verifyWebhookSignature({
					headers: withoutNonce,
					body: BODY,
					secret: SECRET,
					now,
				})
			).toBeUndefined();
		});

		it("rejects a callback whose payload is not a task result", () => {
			const body = { unrelated: "payload" };

			const result = verifyWebhookSignature({
				headers: headers(signIndependently(timestamp, body), timestamp),
				body,
				secret: SECRET,
				now,
			});

			expect(result).toBeUndefined();
		});

		it("rejects a callback that cannot be canonicalized", () => {
			const body = { id: "1", status: 1, nested: { a: 1 } };

			const result = verifyWebhookSignature({
				headers: headers(signIndependently(timestamp, body), timestamp),
				body,
				secret: SECRET,
				now,
			});

			expect(result).toBeUndefined();
		});

		it("accepts headers that arrived in different casing", () => {
			const signed = signIndependently(timestamp, BODY);

			const result = verifyWebhookSignature({
				headers: {
					"webhook-timestamp": timestamp,
					"webhook-nonce": NONCE,
					"webhook-signature": signed,
				},
				body: BODY,
				secret: SECRET,
				now,
			});

			expect(result).toMatchObject({ status: 1 });
		});
	});
});
