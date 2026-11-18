import { z } from "zod/v4";

/**
 * The payload the image upload endpoint answers with.
 *
 * An `img_id` is only valid for the API account and region that uploaded
 * it, and only the endpoints that accept an image can consume it.
 */
export const UploadImageResponseSchema = z
	.object({
		img_id: z.int().describe("Identifier of the uploaded image."),
		img_url: z.string().describe("URL the uploaded image is served from."),
	})
	.catchall(z.unknown())
	.meta({
		id: "PixverseUploadImageResponse",
		description: "The image an upload endpoint accepted.",
	});

/**
 * The payload the media upload endpoint answers with.
 *
 * Video and audio are uploaded through the same endpoint; `media_id` is the
 * handle an operation such as lipsync or upscale consumes.
 */
export const UploadMediaResponseSchema = z
	.object({
		media_id: z.int().describe("Identifier of the uploaded media."),
	})
	.catchall(z.unknown())
	.meta({
		id: "PixverseUploadMediaResponse",
		description: "The media an upload endpoint accepted.",
	});

/**
 * The payload of the account balance endpoint.
 */
export const AccountBalanceResponseSchema = z
	.object({
		account_id: z.int().describe("Identifier of the API account."),
		credit_monthly: z.int().optional().describe("Monthly plan credits."),
		credit_package: z.int().optional().describe("Purchased credits."),
	})
	.catchall(z.unknown())
	.meta({
		id: "PixverseAccountBalance",
		description: "The credit balance of the API account.",
	});

export type UploadImageResponse = z.infer<typeof UploadImageResponseSchema>;
export type UploadMediaResponse = z.infer<typeof UploadMediaResponseSchema>;
export type AccountBalanceResponse = z.infer<
	typeof AccountBalanceResponseSchema
>;
