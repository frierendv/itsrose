import { z } from "zod/v4";

/**
 * The `transaction_status` used by Midtrans API.
 */
export const TransactionStatusSchema = z.enum([
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
]);
export type TransactionStatus = z.infer<typeof TransactionStatusSchema>;

/**
 * Fraud status used by Midtrans API.
 */
export const TransactionFraudStatusSchema = z.enum(["accept", "deny"]);

export type TransactionFraudStatus = z.infer<
	typeof TransactionFraudStatusSchema
>;
