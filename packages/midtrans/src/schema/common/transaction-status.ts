import { z } from "zod/v4";

/* ------------------------- Reusable enum (mostly) ------------------------- */
/**
 * The `transaction_status` used by Midtrans API.
 */
export const TransactionStatusSchema = z
	.enum([
		"authorize",
		"capture",
		"settlement",
		"deny",
		"pending",
		"cancel",
		"refund",
		"partial_refund",
		"chargeback",
		"partial_chargeback",
		"expire",
		"failure",
	])
	.meta({
		id: "MidtransTransactionStatus",
	});
export type TransactionStatus = z.infer<typeof TransactionStatusSchema>;

/**
 * Fraud status used by Midtrans API.
 */
export const FraudStatusSchema = z.enum(["accept", "deny"]);

export type FraudStatus = z.infer<typeof FraudStatusSchema>;
