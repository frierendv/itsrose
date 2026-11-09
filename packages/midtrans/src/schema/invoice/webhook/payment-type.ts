import { z } from "zod/v4";
import { PaymentTypeSchema, QrisAcquirerSchema } from "../../core";
import { BankCodeSchema } from "../../shared";

export const InvoiceWebhookBankTransferSchema = z.object({
	payment_type: PaymentTypeSchema.extract(["bank_transfer"]),
	va_numbers: z
		.object({
			bank: BankCodeSchema,
			va_number: z.string(),
		})
		.array(),
	payment_amounts: z.array(z.record(z.string(), z.any())).nullish(),
});
export type InvoiceWebhookBankTransfer = z.infer<
	typeof InvoiceWebhookBankTransferSchema
>;
export const InvoiceWebhookQrisSchema = z.object({
	payment_type: PaymentTypeSchema.extract(["qris"]),

	acquirer: QrisAcquirerSchema.optional(),
	reference_id: z.string().optional(),
	shopeepay_reference_number: z.string().optional(),
	issuer: z.string().optional(),
});
export type InvoiceWebhookQris = z.infer<typeof InvoiceWebhookQrisSchema>;

export const InvoiceWebhookPaymentTypeFieldsSchema = z.discriminatedUnion(
	"payment_type",
	[InvoiceWebhookBankTransferSchema, InvoiceWebhookQrisSchema]
);
export type InvoiceWebhookPaymentTypeFields = z.infer<
	typeof InvoiceWebhookPaymentTypeFieldsSchema
>;
