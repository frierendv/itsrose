import { z } from "zod/v4";
import { PaymentTypeSchema, QrisAcquirerSchema } from "../core";
import {
	BankCodeSchema,
	TransactionFraudStatusSchema,
	TransactionStatusSchema,
} from "../primitives";
import { InvoiceMetadataSchema } from "./shared";

export const InvoiceWebhookCustomerDetailsSchema = z.object({
	full_name: z.string().nullish(),
	email: z.string().nullish(),
	phone: z.string().nullish(),
});
export type InvoiceWebhookCustomerDetails = z.infer<
	typeof InvoiceWebhookCustomerDetailsSchema
>;

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

export const InvoiceWebhookSchema = z
	.object({
		status_code: z.string(),
		order_id: z.string(),
		transaction_id: z.string(),
		transaction_time: z.string(),
		transaction_status: TransactionStatusSchema,
		fraud_status: TransactionFraudStatusSchema,
		payment_type: PaymentTypeSchema,
		gross_amount: z.coerce.number(),
		customer_details: InvoiceWebhookCustomerDetailsSchema,
		expiry_time: z.string(),
		metadata: InvoiceMetadataSchema,
		currency: z.string(),
		signature_key: z.string(),
	})
	.and(InvoiceWebhookPaymentTypeFieldsSchema);

export type InvoiceWebhook = z.infer<typeof InvoiceWebhookSchema>;
