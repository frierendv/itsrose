import { z } from "zod/v4";
import { AddressSchema } from "./address";

/**
 * Midtrans customer details object.
 */
export const CustomerDetailsSchema = z
	.object({
		/** Given id for this customer. */
		id: z.string().max(36),
		/** Customer email address */
		email: z.email().max(255),
	})
	.extend(
		AddressSchema.pick({
			first_name: true,
			last_name: true,
			phone: true,
		}).shape
	)
	.extend({
		billing_address: AddressSchema.optional(),
		shipping_address: AddressSchema.optional(),
	});

export type CustomerDetails = z.infer<typeof CustomerDetailsSchema>;
