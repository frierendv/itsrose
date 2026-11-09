import { z } from "zod/v4";

/**
 * Billing schedule returned by the Subscription API.
 */
export const SubscriptionResponseScheduleSchema = z.object({
	interval: z.number(),
	current_interval: z.number(),
	interval_unit: z.string(),
	start_time: z.string(),
	previous_execution_at: z.string().optional(),
	next_execution_at: z.string().optional(),
});

export type SubscriptionResponseSchedule = z.infer<
	typeof SubscriptionResponseScheduleSchema
>;

/**
 * Retry schedule used after a failed recurring charge.
 */
export const SubscriptionRetryScheduleSchema = z.object({
	interval_unit: z.string(),
	max_interval: z.number(),
	interval: z.number(),
});

export type SubscriptionRetrySchedule = z.infer<
	typeof SubscriptionRetryScheduleSchema
>;

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
