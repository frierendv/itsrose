import { z } from "zod/v4";
import { Address } from "./address";

/**
 * Midtrans customer details object.
 */
export const CustomerDetails = z
	.object({
		first_name: z.string().max(50),
		last_name: z.string().max(50),
		email: z.email().max(255),
		phone: z.string().max(15),
		billing_address: Address,
		shipping_address: Address,
		notes: z
			.string()
			.max(255)
			.optional()
			.describe("Special notes or instructions (used in Payment Link)"),
	})
	.partial()
	.meta({
		id: "MidtransCustomerDetails",
	});

export type CustomerDetails = z.infer<typeof CustomerDetails>;
