import { z } from "zod/v4";
import { PaymentActionSchema, VaNumberSchema } from "./payment-actions";

/**
 * Canonical transaction result schema representing payment status across Core API, Snap, and Webhooks.
 */
export const BaseTransactionResultSchema = z
	.object({
		status_code: z
			.string()
			.describe("Payment transaction status code (e.g. '200', '201')"),
		status_message: z
			.string()
			.describe("Human readable status description"),
		transaction_id: z
			.string()
			.describe("Midtrans unique transaction identifier (UUID)"),
		order_id: z.string().describe("Merchant unique order identifier"),
		merchant_id: z.string().optional().describe("Midtrans merchant ID"),
		gross_amount: z
			.string()
			.describe(
				"Transaction gross amount formatted as string (e.g. '10000.00')"
			),
		currency: z
			.string()
			.default("IDR")
			.describe("Transaction currency code"),
		payment_type: z
			.string()
			.describe(
				"Payment channel used (e.g. 'bank_transfer', 'qris', 'gopay')"
			),
		transaction_time: z
			.string()
			.describe("Timestamp when transaction was created"),
		transaction_status: z
			.string()
			.describe(
				"Transaction lifecycle status (e.g. 'settlement', 'pending')"
			),
		fraud_status: z
			.string()
			.optional()
			.describe("Fraud detection status ('accept', 'challenge', 'deny')"),

		// Bank transfer specific fields
		va_numbers: z.array(VaNumberSchema).optional(),
		permata_va_number: z.string().optional(),

		// Mandiri Bill (echannel)
		bill_key: z.string().optional(),
		biller_code: z.string().optional(),

		// QRIS & E-Wallets
		actions: z.array(PaymentActionSchema).optional(),
		qr_string: z.string().optional(),
		acquirer: z.string().optional(),

		// Over the counter (cstorage: Indomaret / Alfamart)
		payment_code: z.string().optional(),
	})
	.meta({
		id: "MidtransBaseTransactionResult",
	});

export type BaseTransactionResult = z.infer<typeof BaseTransactionResultSchema>;
