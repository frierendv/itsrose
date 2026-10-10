import { z } from "zod/v4";

export const InvoiceMetadataSchema = z.object({
	/**
	 * Invoice id; if this come from webhook
	 */
	midtrans_invoice_id: z.string(),

	extra_info: z
		.object({
			payment_link_type: z
				.enum(["FIXED_AMOUNT", "DYNAMIC_AMOUNT"])
				.optional(),
			payment_link_id: z.string().optional(),
		})
		.nullish(),
});

export type InvoiceMetadata = z.infer<typeof InvoiceMetadataSchema>;
