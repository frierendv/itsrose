import { z } from "zod/v4";

/**
 * ShopeePay payment parameters.
 */
export const ShopeepayFieldsSchema = z
	.object({
		/**
		 * The URL to redirect the customer back from the ShopeePay app.
		 *
		 * Default value is the finish URL, configured on your MAP account.
		 */
		callback_url: z.url().optional(),
	})
	.meta({
		id: "MidtransShopeepayFields",
	});

export type ShopeepayFields = z.infer<typeof ShopeepayFieldsSchema>;
