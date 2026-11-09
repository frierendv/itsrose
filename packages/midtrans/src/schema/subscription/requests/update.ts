import { z } from "zod/v4";
import { SubscriptionCreateRequestSchema } from "./create";

/**
 * Payload for updating a subscription.
 *
 * Every field is optional; omitted fields keep their current value.
 */
export const SubscriptionUpdateRequestSchema =
	SubscriptionCreateRequestSchema.partial();

export type SubscriptionUpdateRequest = z.infer<
	typeof SubscriptionUpdateRequestSchema
>;
