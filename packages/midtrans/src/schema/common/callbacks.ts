import { z } from "zod/v4";

/**
 * Midtrans redirection callback URLs.
 */
export const Callbacks = z
	.object({
		finish: z
			.url()
			.optional()
			.describe("Redirect URL when payment is successfully completed"),
		unfinish: z
			.url()
			.optional()
			.describe(
				"Redirect URL when customer cancels or leaves payment uncompleted"
			),
		error: z
			.url()
			.optional()
			.describe("Redirect URL when a payment error occurs"),
	})
	.meta({
		id: "MidtransCallbacks",
	});

export type Callbacks = z.infer<typeof Callbacks>;
