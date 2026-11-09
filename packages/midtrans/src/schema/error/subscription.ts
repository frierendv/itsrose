import { z } from "zod/v4";

/**
 * Subscription API errors.
 *
 * Unlike Core API errors, these do not always include a `status_code`:
 *
 * - `400`: `{ status_message, validation_messages }`
 * - `404`: `{ status_message }`
 */
export const SubscriptionErrorSchema = z.object({
	status_code: z.coerce.number().optional(),
	status_message: z.string(),
	validation_messages: z.array(z.string()).optional(),
	id: z.string().optional(),
});

export type SubscriptionError = z.infer<typeof SubscriptionErrorSchema>;
