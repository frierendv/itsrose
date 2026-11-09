import { z } from "zod/v4";
import { MetadataSchema } from "../../shared";
import { SubscriptionScheduleSchema } from "../shared";

/**
 * Payload for creating a recurring subscription.
 *
 * `POST /v1/subscriptions`
 */
export const SubscriptionCreateRequestSchema = z.object({
	/** Subscription name. */
	name: z.string(),
	/** Recurring amount. Midtrans accepts a decimal string. */
	amount: z.union([z.string(), z.number()]),
	/** Currency code, defaults to `IDR`. */
	currency: z.string(),
	/** Payment type used for recurring charges. */
	payment_type: z.string(),
	/** Saved payment token. */
	token: z.string(),
	/** Billing schedule. */
	schedule: SubscriptionScheduleSchema,
	/** Arbitrary metadata. */
	metadata: MetadataSchema.optional(),
});

export type SubscriptionCreateRequest = z.infer<
	typeof SubscriptionCreateRequestSchema
>;
