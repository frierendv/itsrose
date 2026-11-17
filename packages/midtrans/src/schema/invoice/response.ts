import { z } from "zod/v4";
import {
	InvoiceDocumentTypeSchema,
	InvoicePaymentTypeSchema,
	InvoiceStatusSchema,
	InvoiceTaxModeSchema,
} from "./shared";

export const InvoiceResponseQuotationSchema = z
	.discriminatedUnion("created_as", [
		z.object({
			created_as: InvoiceDocumentTypeSchema.extract(["quotation"]),
			document_type: InvoiceDocumentTypeSchema.extract(["quotation"]),
			quotation_published_date: z.string().nullish(),
			quotation_pdf_url: z.string().nullish(),
			payment_link_url: z.string().nullish(),
		}),
		z.object({
			created_as: InvoiceDocumentTypeSchema.extract(["invoice"]),
			document_type: InvoiceDocumentTypeSchema.extract(["invoice"]),
			payment_link_url: z.string().nullish(),
		}),
	])
	.and(
		z.object({
			quotation_title: z.string().nullish(),
			quotation_terms_conditions: z.string().nullish(),
			converted_at: z.string().nullish(),
		})
	);

/**
 * Digital invoice details returned by create and get endpoints.
 *
 * `POST /v1/invoices` / `GET /v1/invoices/{invoiceId}`
 */
export const InvoiceResponseSchema = z
	.object({
		id: z.string(),
		order_id: z.string(),
		invoice_number: z.string(),
		invoice_title: z.string().nullish(),
		invoice_paid_title: z.string().nullish(),
		published_date: z.string().nullish(),
		due_date: z.string(),
		invoice_date: z.string(),
		paid_date: z.string().nullish(),
		reference: z.string().nullish(),
		notes: z.string().nullish(),
		terms_conditions: z.string().nullish(),
		status: InvoiceStatusSchema,
		gross_amount: z.int(),
		pdf_url: z.string().nullish(),
		paid_pdf_url: z.string().nullish(),
		shortened_pdf_url: z.string().nullish(),
		payment_type: InvoicePaymentTypeSchema,
		payment_link_url: z.string().nullish(),
		virtual_accounts: z
			.array(z.record(z.string(), z.unknown()))
			.default([]),
		customer_details: z.record(z.string(), z.unknown()),
		item_details: z.array(z.record(z.string(), z.unknown())),
		amount: z.record(z.string(), z.unknown()).nullish(),
		external_group_id: z.string().nullish(),
		tax_mode: InvoiceTaxModeSchema.nullable().optional(),
		taxes: z.array(z.record(z.string(), z.unknown())).default([]),
		document_type: InvoiceDocumentTypeSchema.nullable().optional(),
		created_as: z.string().nullish(),
		quotation_date: z.string().nullish(),
		quotation_title: z.string().nullish(),
		quotation_validity_date: z.string().nullish(),
		quotation_pdf_url: z.string().nullish(),
		quotation_published_date: z.string().nullish(),
		quotation_terms_conditions: z.string().nullish(),
		converted_at: z.string().nullish(),
	})
	.meta({ id: "MidtransInvoiceResponse" });

export type InvoiceResponse = z.infer<typeof InvoiceResponseSchema>;

/**
 * Response returned when voiding an invoice.
 */
export const InvoiceVoidResponseSchema = z
	.object({
		success: z.boolean(),
	})
	.meta({ id: "MidtransInvoiceVoidResponse" });

export type InvoiceVoidResponse = z.infer<typeof InvoiceVoidResponseSchema>;
