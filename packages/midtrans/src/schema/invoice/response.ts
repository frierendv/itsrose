import { z } from "zod/v4";
import { deepNullable } from "../helper";
import { InvoiceRequestSchema } from "./request";
import { InvoiceDocumentTypeSchema, InvoiceStatusSchema } from "./shared";

export const InvoiceResponseQuotationSchema = z
	.discriminatedUnion("created_as", [
		z.object({
			created_as: InvoiceDocumentTypeSchema.extract(["quotation"]),
			document_type: InvoiceDocumentTypeSchema.extract(["quotation"]),
			quotation_published_date: z.string(),
			quotation_pdf_url: z.string(),

			payment_link_url: z.string().nullish(),
		}),
		z.object({
			created_as: InvoiceDocumentTypeSchema.extract(["invoice"]),
			document_type: InvoiceDocumentTypeSchema.extract(["invoice"]),
			/**
			 * Payment link url.
			 */
			payment_link_url: z.string(),
		}),
	])
	.and(
		z.object({
			quotation_title: z.string().nullable(),
			quotation_terms_conditions: z.string().nullable(),
			converted_at: z.string().nullable(),
		})
	);

export const InvoiceResponseSchema = z
	.object({
		/**
		 * Invoice unique identifier.
		 *
		 * ### Used for get invoice API.
		 */
		id: z.string(),

		status: InvoiceStatusSchema,
		published_date: z.string().nullable(),
		/**
		 * Invoice pdf url for non paid.
		 */
		pdf_url: z.string().nullable(),
		/**
		 * Invoice paid pdf url
		 */
		paid_pdf_url: z.string().nullable(),
		paid_date: z.string().nullable(),
		gross_amount: z.int(),
	})
	.and(InvoiceResponseQuotationSchema)
	// take request with deep nullable
	.and(deepNullable(InvoiceRequestSchema));

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
