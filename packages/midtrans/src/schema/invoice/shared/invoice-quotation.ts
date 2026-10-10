import { z } from "zod/v4";

export const InvoiceQuotationSchema = z.object({
	/**
	 * Date when the quotation is issued, in ISO 8601 format.
	 *
	 * Default time zone: GMT+7.
	 */
	quotation_date: z.string(),
	/**
	 * Expiration date of the quotation, in ISO 8601 format.
	 *
	 * Default time zone: GMT+7 and must be after `quotation_date`.
	 */
	quotation_validity_date: z.string(),
	quotation_title: z.string().max(30).optional(),
	quotation_terms_conditions: z.string().max(255).optional(),
});
export type InvoiceQuotation = z.infer<typeof InvoiceQuotationSchema>;
