import { z } from "zod/v4";
import { PaymentTypeSchema, QrisAcquirerSchema } from "../core";
import {
	BankCodeSchema,
	PaymentAmountSchema,
	SignedAmountSchema,
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
	/**
	 * The partial payments that made up the transfer.
	 *
	 * Midtrans sends one entry per payment chunk, each with the amount that
	 * was paid and when it was paid. The shape is the one the package already
	 * models for the same upstream field in the transaction notification and
	 * in the transaction status response.
	 */
	payment_amounts: z.array(PaymentAmountSchema).nullish(),
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
		/**
		 * The signed amount, kept exactly as Midtrans sent it.
		 *
		 * It is the raw 2-decimal string (`"15000.00"`) because that string —
		 * not a parsed number — is what the notification signature covers.
		 */
		gross_amount: SignedAmountSchema,
		customer_details: InvoiceWebhookCustomerDetailsSchema,
		expiry_time: z.string(),
		metadata: InvoiceMetadataSchema,
		currency: z.string(),
		signature_key: z.string(),
	})
	.and(InvoiceWebhookPaymentTypeFieldsSchema);

export type InvoiceWebhook = z.infer<typeof InvoiceWebhookSchema>;
