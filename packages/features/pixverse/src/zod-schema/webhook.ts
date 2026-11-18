import { z } from "zod/v4";

/**
 * The retry delays PixVerse uses when a callback is not acknowledged.
 *
 * Values are in milliseconds, in delivery order.
 */
export const PIXVERSE_WEBHOOK_RETRY_DELAYS_MS = [
	2_000, 10_000, 30_000, 60_000, 300_000, 900_000, 3_600_000, 14_400_000,
] as const;

/**
 * A task-status callback PixVerse delivers.
 *
 * The body carries the current task result rather than an envelope, and its
 * fields vary by capability and status - so the schema validates what the
 * callback is guaranteed to carry and keeps the rest.
 */
export const WebhookCallbackSchema = z
	.object({
		id: z.string().describe("Identifier of the task the callback is for."),
		status: z.int().describe("1 completed, 5 generating, 7 or 8 failed."),
		url: z.string().optional().describe("URL of the generated video."),
		size: z.number().optional().describe("Size of the output, in MB."),
		has_audio: z.boolean().optional(),
		credits: z.int().optional().describe("Credits the task consumed."),
	})
	.catchall(z.unknown())
	.meta({
		id: "PixverseWebhookCallback",
		description: "A task-status callback PixVerse delivers.",
	});

/**
 * The headers PixVerse signs a callback with.
 */
export const WebhookSignatureHeadersSchema = z.object({
	"webhook-timestamp": z.string().describe("Unix timestamp in seconds."),
	"webhook-nonce": z
		.string()
		.describe("32-character random lowercase alphanumeric string."),
	"webhook-signature": z
		.string()
		.describe("Base64-encoded HMAC-SHA256 signature."),
});

export type WebhookCallback = z.infer<typeof WebhookCallbackSchema>;
export type WebhookSignatureHeaders = z.infer<
	typeof WebhookSignatureHeadersSchema
>;
