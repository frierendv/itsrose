import { z } from "zod/v4";
import { CoreTransactionResponseSchema } from "./transaction";

/**
 * Response of `GET /v2/{order_id}/status/b2b`.
 */
export const CoreStatusB2BResponseSchema = z
	.object({
		status_code: z.string(),
		status_message: z.string(),
		transactions: z.array(CoreTransactionResponseSchema),
	})
	.meta({
		id: "MidtransCoreStatusB2BResponse",
	});

export type CoreStatusB2BResponse = z.infer<typeof CoreStatusB2BResponseSchema>;
