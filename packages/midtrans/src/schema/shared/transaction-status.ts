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
export const TransactionFraudStatusSchema = z.enum(["accept", "deny"]);

export type TransactionFraudStatus = z.infer<
	typeof TransactionFraudStatusSchema
>;

/**
 * Alias kept for callers that import the fraud status schema by its
 * historical name.
 */
export const FraudStatusSchema = TransactionFraudStatusSchema;
export type FraudStatus = TransactionFraudStatus;
