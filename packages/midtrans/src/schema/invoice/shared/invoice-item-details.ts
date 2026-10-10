import { z } from "zod/v4";

/**
 * Item detail used by Invoice API
 */
export const InvoiceItemDetailsSchema = z
	// must have either item_id or description
	.union([
		z.object({ item_id: z.string() }),
		z.object({ description: z.string().max(150) }),
	])
	.and(
		z.object({
			item_id: z.string().optional(),
			description: z.string().max(150).optional(),
			quantity: z.number().positive().min(1).max(99999999),
			price: z.number().positive().max(99999999),
			discount_percentage: z.number().positive().max(100).optional(),

			// omitted in request
			discount_amount: z.union([z.number(), z.string()]).nullish(),
		})
	);

export type InvoiceItemDetails = z.infer<typeof InvoiceItemDetailsSchema>;
