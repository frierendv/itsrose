import { z } from "zod/v4";

/**
 * Response returned from creating a Snap transaction.
 *
 * `POST /snap/v1/transactions`
 */
export const SnapTransactionResponse = z
	.object({
		/**
		 * Snap payment token.
		 *
		 * Can be used to pass into Snap.js
		 */
		token: z.string().describe("Snap payment token to pass into Snap.js"),
		/**
		 * Hosted payment checkout page URL to redirect customer to.
		 */
		redirect_url: z.url(),
	})
	.meta({
		id: "MidtransSnapTransactionResponse",
	});

export type SnapTransactionResponse = z.infer<typeof SnapTransactionResponse>;
