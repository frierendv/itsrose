import { z } from "zod/v4";
import {
	InvoiceAmountSchema,
	InvoiceCustomerDetailsSchema,
	InvoiceDocumentTypeSchema,
	InvoiceItemDetailsSchema,
	InvoicePaymentLinkSchema,
	InvoicePaymentTypeSchema,
	InvoicePaymentVirtualAccountSchema,
	InvoiceTaxModeSchema,
	InvoiceTaxSchema,
} from "./shared";

/**
 * Payload for creating an invoice.
 *
 * Fields are intentionally flat: conditional requirements (`payment_link` for
 * `payment_link`, `virtual_accounts` for `virtual_account`, quotation fields
 * for quotations) are enforced by the API and documented on each field.
 */
export const InvoiceRequestSchema = z.object({
	//
	// ----- Required fields
	//
	order_id: z.string(),
	invoice_number: z.string(),
	/** Invoice date in ISO-8601 with offset (e.g. `2026-11-09T22:00:00+07:00`). */
	invoice_date: z.string(),
	/** Due date in ISO-8601 with offset; must be after `invoice_date`. */
	due_date: z.string(),
	customer_details: InvoiceCustomerDetailsSchema,
	item_details: InvoiceItemDetailsSchema.array(),
	//
	// Partial fields
	//
	amount: InvoiceAmountSchema.optional(),
	invoice_title: z.string().optional(),
	invoice_paid_title: z.string().optional(),
	reference: z.string().max(90).optional(),
	notes: z.string().max(1000).optional(),

	//
	// Payment
	//
	payment_type: InvoicePaymentTypeSchema,
	payment_link: InvoicePaymentLinkSchema.shape.payment_link,
	virtual_accounts:
		InvoicePaymentVirtualAccountSchema.shape.virtual_accounts.optional(),

	//
	// Tax
	//
	tax_mode: InvoiceTaxModeSchema.nullish(),
	taxes: InvoiceTaxSchema.array().optional(),

	//
	// Document type
	//
	document_type: InvoiceDocumentTypeSchema.optional(),
	quotation_date: z.string().optional(),
	quotation_validity_date: z.string().optional(),
	quotation_title: z.string().max(30).optional(),
	quotation_terms_conditions: z.string().max(255).optional(),
});

export type InvoiceRequest = z.infer<typeof InvoiceRequestSchema>;
