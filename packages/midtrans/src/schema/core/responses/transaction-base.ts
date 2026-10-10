import { z } from "zod/v4";
import {
	MetadataSchema,
	TransactionFraudStatusSchema,
	TransactionStatusSchema,
} from "../../shared";
import { PaymentTypeSchema } from "../payment";

export const ResponseTransactionBaseSchema = z.object({
	/**
	 * Payment transaction status code (e.g. '200', '201').
	 */
	status_code: z.string(),
	/**
	 * Human readable status description.
	 */
	status_message: z.string(),
	/**
	 * Midtrans unique transaction identifier (UUID).
	 */
	transaction_id: z.string(),
	/**
	 * Merchant unique order identifier.
	 */
	order_id: z.string(),
	/**
	 * Midtrans merchant ID.
	 */
	merchant_id: z.string().optional(),
	/**
	 * Transaction gross amount formatted as string (e.g. '10000.00').
	 */
	gross_amount: z.string(),
	/**
	 * Transaction currency code "IDR".
	 */
	currency: z.string(),
	/**
	 * Payment channel used (e.g. 'bank_transfer', 'qris', 'gopay').
	 */
	payment_type: PaymentTypeSchema,
	/**
	 * Timestamp when transaction was created.
	 */
	transaction_time: z.string(),
	/**
	 * Transaction lifecycle status (e.g. 'settlement', 'pending').
	 */
	transaction_status: TransactionStatusSchema,
	/**
	 * Fraud detection status ('accept', 'challenge', 'deny').
	 */
	fraud_status: TransactionFraudStatusSchema,
	/**
	 * Transaction signature
	 */
	signature_key: z.string(),
	/**
	 * Metadata
	 */
	metadata: MetadataSchema.optional(),
});

export type ResponseTransactionBase = z.infer<
	typeof ResponseTransactionBaseSchema
>;
