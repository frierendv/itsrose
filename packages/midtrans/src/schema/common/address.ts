import { z } from "zod/v4";

/**
 * Midtrans billing or shipping address details.
 */
export const Address = z
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

export const BillingAddress = Address;
export const ShippingAddress = Address;

export type Address = z.infer<typeof Address>;
export type BillingAddress = Address;
export type ShippingAddress = Address;
