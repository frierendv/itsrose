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
			quotation_published_date: z.string().nullable().optional(),
			quotation_pdf_url: z.string().nullable().optional(),
			payment_link_url: z.string().nullish(),
		}),
		z.object({
			created_as: InvoiceDocumentTypeSchema.extract(["invoice"]),
			document_type: InvoiceDocumentTypeSchema.extract(["invoice"]),
			payment_link_url: z.string().nullable().optional(),
		}),
	])
	.and(
		z.object({
			quotation_title: z.string().nullable().optional(),
			quotation_terms_conditions: z.string().nullable().optional(),
			converted_at: z.string().nullable().optional(),
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
		invoice_title: z.string().nullable().optional(),
		invoice_paid_title: z.string().nullable().optional(),
		published_date: z.string().nullable().optional(),
		due_date: z.string(),
		invoice_date: z.string(),
		paid_date: z.string().nullable().optional(),
		reference: z.string().nullable().optional(),
		notes: z.string().nullable().optional(),
		terms_conditions: z.string().nullable().optional(),
		status: InvoiceStatusSchema,
		gross_amount: z.int(),
		pdf_url: z.string().nullable().optional(),
		paid_pdf_url: z.string().nullable().optional(),
		shortened_pdf_url: z.string().nullable().optional(),
		payment_type: InvoicePaymentTypeSchema,
		payment_link_url: z.string().nullable().optional(),
		virtual_accounts: z
			.array(z.record(z.string(), z.unknown()))
			.optional()
			.default([]),
		customer_details: z.record(z.string(), z.unknown()),
		item_details: z.array(z.record(z.string(), z.unknown())),
		amount: z.record(z.string(), z.unknown()).nullable().optional(),
		external_group_id: z.string().nullable().optional(),
		tax_mode: InvoiceTaxModeSchema.nullable().optional(),
		taxes: z
			.array(z.record(z.string(), z.unknown()))
			.optional()
			.default([]),
		document_type: InvoiceDocumentTypeSchema.nullable().optional(),
		created_as: z.string().nullable().optional(),
		quotation_date: z.string().nullable().optional(),
		quotation_title: z.string().nullable().optional(),
		quotation_validity_date: z.string().nullable().optional(),
		quotation_pdf_url: z.string().nullable().optional(),
		quotation_published_date: z.string().nullable().optional(),
		quotation_terms_conditions: z.string().nullable().optional(),
		converted_at: z.string().nullable().optional(),
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
