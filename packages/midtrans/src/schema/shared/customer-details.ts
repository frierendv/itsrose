import { z } from "zod/v4";

/**
 * Midtrans billing or shipping address details.
 */
export const CustomerAddressSchema = z
	.object({
		/** Customer first name. */
		first_name: z.string().max(50),
		/** Customer last name. */
		last_name: z.string().max(50),
		/** Customer phone. */
		phone: z.string().max(30),
		/** Customer billing address. */
		address: z.string().max(200),
		/** Customer billing address city. */
		city: z.string().max(100),
		/** Customer address postal code. */
		postal_code: z
			.string()
			.max(255)
			.regex(/^[a-zA-Z0-9 -]+$/, {
				message:
					"Only alphabets, numbers, dashes (-), and spaces are allowed.",
			}),
		/**
		 * Customer address country code.
		 *
		 * Only `IDN` are allowed.
		 */
		country_code: z.literal("IDN"),
	})
	.partial()
	.meta({
		title: "Address Fields",
		id: "MidtransAddress",
	});

export type CustomerAddress = z.infer<typeof CustomerAddressSchema>;

/**
 * Midtrans customer details object.
 */
export const CustomerDetailsSchema = z
	.object({
		/**
		 * Given id for this customer.
		 */
		id: z.string().max(36),
		/**
		 * Customer email address
		 */
		email: z.email().max(255),
	})
	.extend(
		CustomerAddressSchema.pick({
			first_name: true,
			last_name: true,
			phone: true,
		}).shape
	)
	.extend({
		billing_address: CustomerAddressSchema.optional(),
		shipping_address: CustomerAddressSchema.optional(),
	});

export type CustomerDetails = z.infer<typeof CustomerDetailsSchema>;
