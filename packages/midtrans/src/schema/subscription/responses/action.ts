import { z } from "zod/v4";

/**
 * Response returned by subscription actions
 * (`disable`, `enable`, `update`, `cancel`).
 */
export const SubscriptionActionResponseSchema = z
	.object({
		status_message: z.string(),
	})
	.meta({ id: "MidtransSubscriptionActionResponse" });

export type SubscriptionActionResponse = z.infer<
	typeof SubscriptionActionResponseSchema
>;
