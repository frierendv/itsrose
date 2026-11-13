import { z } from "zod/v4";
import {
	TransactionFraudStatusSchema,
	TransactionStatusSchema,
	type FraudStatus,
	type TransactionStatus,
} from "../schema";

/* ----------------------------- Outcome Model ----------------------------- */

/**
 * The outcome vocabulary of the Midtrans side.
 *
 * These values are **not** wire shapes and **not** Invoice Status. They are a
 * normalised, Midtrans-specific view over the upstream `transaction_status` /
 * `fraud_status` pair, used to reason about a charge independently from the
 * billing domain that consumes it.
 *
 * - `paid`: the money is captured and settled for the merchant.
 * - `pending`: the charge is still awaiting the customer or the processor.
 * - `failed`: the charge will never complete (denied, cancelled, expired, failed).
 * - `refunded`: the money was returned to the customer, in full or in part,
 *   either by the merchant or by an issuer chargeback.
 * - `challenged`: Midtrans Fraud Detection System asked for extra verification.
 * - `unknown`: the input is not a vocabulary this classifier understands.
 */
export const TransactionOutcomeSchema = z.enum([
	"paid",
	"pending",
	"failed",
	"refunded",
	"challenged",
	"unknown",
]);
export type TransactionOutcome = z.infer<typeof TransactionOutcomeSchema>;

/**
 * Every outcome the classifier can produce, in declaration order.
 */
export const TRANSACTION_OUTCOMES = TransactionOutcomeSchema.options;

const classificationFields = {
	/** The raw `transaction_status` exactly as Midtrans sent it. */
	transaction_status: z.string(),
	/** The raw `fraud_status` exactly as Midtrans sent it, when present. */
	fraud_status: z.string().optional(),
};

/**
 * The discriminated result of classifying a transaction status.
 *
 * The `outcome` discriminator narrows the remaining fields, and `is_final`
 * tells the caller whether the charge can still change.
 */
export const TransactionClassificationSchema = z.discriminatedUnion("outcome", [
	z.object({
		outcome: z.literal("paid"),
		...classificationFields,
		is_final: z.literal(true),
	}),
	z.object({
		outcome: z.literal("pending"),
		...classificationFields,
		is_final: z.literal(false),
	}),
	z.object({
		outcome: z.literal("failed"),
		...classificationFields,
		is_final: z.literal(true),
	}),
	z.object({
		outcome: z.literal("refunded"),
		...classificationFields,
		is_final: z.literal(true),
	}),
	z.object({
		outcome: z.literal("challenged"),
		...classificationFields,
		is_final: z.literal(false),
	}),
	z.object({
		outcome: z.literal("unknown"),
		...classificationFields,
		is_final: z.literal(false),
	}),
]);
export type TransactionClassification = z.infer<
	typeof TransactionClassificationSchema
>;

/* ---------------------------- Lookup Tables ------------------------------ */

/**
 * Transaction statuses whose outcome is fully determined by the status alone.
 *
 * `capture`, `authorize` and `pending` are omitted on purpose: for those the
 * Fraud Detection System can refine the outcome, so they are handled by
 * {@link FRAUD_OUTCOME_BY_STATUS}.
 */
export const TRANSACTION_STATUS_OUTCOMES = {
	settlement: "paid",
	deny: "failed",
	cancel: "failed",
	expire: "failed",
	failure: "failed",
	refund: "refunded",
	partial_refund: "refunded",
	chargeback: "refunded",
	partial_chargeback: "refunded",
} as const satisfies Record<
	Exclude<TransactionStatus, "capture" | "authorize" | "pending">,
	TransactionOutcome
>;

/**
 * Statuses the Fraud Detection System can still act on.
 */
export type RefinableTransactionStatus = "capture" | "authorize" | "pending";

/**
 * How a `fraud_status` refines the outcome of a refinable status.
 *
 * - `capture` + `accept` (or no fraud status at all) is a paid charge.
 * - `capture` + `challenge` is a charge awaiting extra verification.
 * - `capture` + `deny` is a charge the processor rejected.
 * - `authorize` / `pending` stay pending unless the fraud system challenges or
 *   denies them.
 */
export const FRAUD_OUTCOME_BY_STATUS = {
	capture: { accept: "paid", challenge: "challenged", deny: "failed" },
	authorize: { accept: "pending", challenge: "challenged", deny: "failed" },
	pending: { accept: "pending", challenge: "challenged", deny: "failed" },
} as const satisfies Record<
	RefinableTransactionStatus,
	Record<FraudStatus, TransactionOutcome>
>;

/* ----------------------------- Classifier ------------------------------- */

type ResolvedFraudStatus =
	| { state: "known"; value: FraudStatus }
	| { state: "absent" }
	| { state: "unrecognized" };

function resolveFraudStatus(
	fraudStatus?: FraudStatus | string
): ResolvedFraudStatus {
	if (fraudStatus === undefined || fraudStatus === null) {
		return { state: "absent" };
	}
	const parsed = TransactionFraudStatusSchema.safeParse(fraudStatus);
	return parsed.success
		? { state: "known", value: parsed.data }
		: { state: "unrecognized" };
}

function buildClassification(
	outcome: TransactionOutcome,
	transactionStatus: string,
	fraudStatus?: string
): TransactionClassification {
	switch (outcome) {
		case "paid":
			return {
				outcome: "paid",
				transaction_status: transactionStatus,
				fraud_status: fraudStatus,
				is_final: true,
			};
		case "pending":
			return {
				outcome: "pending",
				transaction_status: transactionStatus,
				fraud_status: fraudStatus,
				is_final: false,
			};
		case "failed":
			return {
				outcome: "failed",
				transaction_status: transactionStatus,
				fraud_status: fraudStatus,
				is_final: true,
			};
		case "refunded":
			return {
				outcome: "refunded",
				transaction_status: transactionStatus,
				fraud_status: fraudStatus,
				is_final: true,
			};
		case "challenged":
			return {
				outcome: "challenged",
				transaction_status: transactionStatus,
				fraud_status: fraudStatus,
				is_final: false,
			};
		default:
			return {
				outcome: "unknown",
				transaction_status: transactionStatus,
				fraud_status: fraudStatus,
				is_final: false,
			};
	}
}

function isKnownTransactionStatus(
	transactionStatus: string
): transactionStatus is TransactionStatus {
	return TransactionStatusSchema.safeParse(transactionStatus).success;
}

/**
 * Classifies a Midtrans transaction into an exhaustive outcome.
 *
 * Every one of the twelve `TransactionStatus` values is classified
 * explicitly, together with the `fraud_status` pairing that can refine it.
 * A `transaction_status` this classifier does not recognise yields the
 * `unknown` outcome instead of being silently reported as "not successful".
 *
 * @param transactionStatus The `transaction_status` sent by Midtrans.
 * @param fraudStatus The optional `fraud_status` sent by Midtrans.
 */
export function classifyTransactionStatus(
	transactionStatus: TransactionStatus | string,
	fraudStatus?: FraudStatus | string
): TransactionClassification {
	const status = transactionStatus;

	if (!isKnownTransactionStatus(status)) {
		return buildClassification("unknown", status, fraudStatus);
	}

	if (
		status === "capture" ||
		status === "authorize" ||
		status === "pending"
	) {
		const fraud = resolveFraudStatus(fraudStatus);
		if (fraud.state === "unrecognized") {
			return buildClassification("unknown", status, fraudStatus);
		}
		const outcome =
			fraud.state === "absent"
				? status === "capture"
					? "paid"
					: "pending"
				: FRAUD_OUTCOME_BY_STATUS[status][fraud.value];
		return buildClassification(outcome, status, fraudStatus);
	}

	return buildClassification(
		TRANSACTION_STATUS_OUTCOMES[status],
		status,
		fraudStatus
	);
}

/* ------------------------------ Predicates ------------------------------- */

/**
 * Checks if a transaction has reached a successful paid state.
 *
 * A transaction is paid if it is `settlement`, or `capture` with a fraud
 * status of `accept` (or no fraud status at all).
 */
export function isSuccessStatus(
	transactionStatus: TransactionStatus | string,
	fraudStatus?: FraudStatus | string
): boolean {
	return (
		classifyTransactionStatus(transactionStatus, fraudStatus).outcome ===
		"paid"
	);
}

/**
 * Checks if a transaction is currently awaiting customer payment.
 */
export function isPendingStatus(
	transactionStatus: TransactionStatus | string,
	fraudStatus?: FraudStatus | string
): boolean {
	return (
		classifyTransactionStatus(transactionStatus, fraudStatus).outcome ===
		"pending"
	);
}

/**
 * Checks if a transaction has terminated without success.
 *
 * Covers `deny`, `cancel`, `expire` and `failure`.
 */
export function isFailedStatus(
	transactionStatus: TransactionStatus | string,
	fraudStatus?: FraudStatus | string
): boolean {
	return (
		classifyTransactionStatus(transactionStatus, fraudStatus).outcome ===
		"failed"
	);
}

/**
 * Checks if a transaction has been refunded, in full or in part.
 *
 * Covers `refund`, `partial_refund`, and the issuer-initiated `chargeback` and
 * `partial_chargeback`. Callers that need to tell a merchant refund apart from
 * a disputed chargeback should read `transaction_status` directly.
 */
export function isRefundedStatus(
	transactionStatus: TransactionStatus | string,
	fraudStatus?: FraudStatus | string
): boolean {
	return (
		classifyTransactionStatus(transactionStatus, fraudStatus).outcome ===
		"refunded"
	);
}

/**
 * Checks if the transaction was flagged as a challenge by the Midtrans Fraud
 * Detection System (FDS).
 */
export function isFraudChallenge(fraudStatus?: FraudStatus | string): boolean {
	return fraudStatus === "challenge";
}

/**
 * Checks if a transaction is awaiting extra verification from the Midtrans
 * Fraud Detection System.
 */
export function isChallengedStatus(
	transactionStatus: TransactionStatus | string,
	fraudStatus?: FraudStatus | string
): boolean {
	return (
		classifyTransactionStatus(transactionStatus, fraudStatus).outcome ===
		"challenged"
	);
}
