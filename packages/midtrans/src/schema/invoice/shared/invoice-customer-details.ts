import { z } from "zod/v4";

/**
 * Customer details specific to invoice creation.
 */
export const InvoiceCustomerDetailsSchema = z.object({
	id: z.string().max(36).optional(),
	name: z.string().max(40),
	email: z.email().optional(),
	phone: z.string().optional(),

	// omitted in request
	notes: z.string().nullish(),
});

export type InvoiceCustomerDetails = z.infer<
	typeof InvoiceCustomerDetailsSchema
>;
