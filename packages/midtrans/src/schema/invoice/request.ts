import { z } from "zod/v4";
import {
	InvoiceAmountSchema,
	InvoiceCustomerDetailsSchema,
	InvoiceDocumentTypeSchema,
	InvoiceItemDetailsSchema,
	InvoicePaymentLinkSchema,
	InvoicePaymentVirtualAccountSchema,
	InvoiceQuotationSchema,
	InvoiceTaxesSchema,
} from "./shared";

export const InvoiceRequestSchema = z
	.object({
		//
		// ----- Required fields
		//
		order_id: z.string(),
		invoice_number: z.string(),
		due_date: z.string(),
		invoice_date: z.string(),
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
	})
	// payment_type
	.and(
		z.discriminatedUnion("payment_type", [
			InvoicePaymentLinkSchema,
			InvoicePaymentVirtualAccountSchema,
		])
	)
	// taxes
	.and(InvoiceTaxesSchema)
	// document type
	.and(
		z.discriminatedUnion("document_type", [
			z
				.object({
					document_type: InvoiceDocumentTypeSchema.extract([
						"invoice",
					]),
				})
				.extend(InvoiceQuotationSchema.shape)
				.partial(),
			z
				.object({
					document_type: InvoiceDocumentTypeSchema.extract([
						"quotation",
					]),
				})
				.extend(InvoiceQuotationSchema.shape),
		])
	);
export type InvoiceRequest = z.infer<typeof InvoiceRequestSchema>;
