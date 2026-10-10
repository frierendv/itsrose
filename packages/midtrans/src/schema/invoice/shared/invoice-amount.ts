import { z } from "zod/v4";

export const InvoiceAmountSchema = z.object({
	/** @deprecated Use `taxes` */
	vat_type: z.string().optional(),
	/** @deprecated Use `taxes` */
	vat: z.string().optional(),
	/**
	 * Discount amount.
	 */
	discount: z
		.number()
		.positive()
		.transform((v) => v.toString())
		.optional(),
	/**
	 * Shipping amount.
	 */
	shipping: z
		.number()
		.positive()
		.transform((v) => v.toString())
		.optional(),

	// omitted in request
	total_tax: z.union([z.string(), z.number()]).optional(),
	base_amount: z.union([z.string(), z.number()]).optional(),
});
export type InvoiceAmount = z.infer<typeof InvoiceAmountSchema>;
