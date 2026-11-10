import { z } from "zod/v4";
import {
	SubscriptionResponseScheduleSchema,
	SubscriptionRetryScheduleSchema,
} from "./schedule";

/**
 * Subscription returned by the Subscription API.
 */
export const SubscriptionResponseSchema = z
	.object({
		id: z.string(),
		name: z.string(),
		amount: z.string(),
		currency: z.string(),
		created_at: z.string(),
		schedule: SubscriptionResponseScheduleSchema,
		status: z.string(),
		token: z.string(),
		payment_type: z.string(),
		transaction_ids: z.array(z.string()),
		retry_schedule: SubscriptionRetryScheduleSchema.optional(),
	})
	.meta({ id: "MidtransSubscriptionResponse" });
export type SubscriptionResponse = z.infer<typeof SubscriptionResponseSchema>;

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
