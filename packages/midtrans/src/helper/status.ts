import type { FraudStatus, TransactionStatus } from "../schema";

/**
 * Checks if a transaction has reached a successful paid state.
 *
 * A transaction is successful if:
 * - `transaction_status` is `settlement`, or
 * - `transaction_status` is `capture` and `fraud_status` is `accept` (or omitted).
 */
export function isSuccessStatus(
	transactionStatus: TransactionStatus | string,
	fraudStatus?: FraudStatus | string
): boolean {
	if (transactionStatus === "settlement") {
		return true;
	}
	if (transactionStatus === "capture") {
		return fraudStatus === "accept" || !fraudStatus;
	}
	return false;
}

/**
 * Checks if a transaction is currently awaiting customer payment.
 */
export function isPendingStatus(
	transactionStatus: TransactionStatus | string
): boolean {
	return transactionStatus === "pending" || transactionStatus === "authorize";
}

/**
 * Checks if a transaction has terminated without success (denied, cancelled, or expired).
 */
export function isFailedStatus(
	transactionStatus: TransactionStatus | string
): boolean {
	return (
		transactionStatus === "deny" ||
		transactionStatus === "cancel" ||
		transactionStatus === "expire"
	);
}

/**
 * Checks if a transaction has been fully or partially refunded.
 */
export function isRefundedStatus(
	transactionStatus: TransactionStatus | string
): boolean {
	return (
		transactionStatus === "refund" || transactionStatus === "partial_refund"
	);
}

/**
 * Checks if a transaction was flagged as a challenge by Midtrans Fraud Detection System (FDS).
 */
export function isFraudChallenge(fraudStatus?: FraudStatus | string): boolean {
	return fraudStatus === "challenge";
}
