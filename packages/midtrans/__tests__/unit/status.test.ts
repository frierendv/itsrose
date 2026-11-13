import {
	classifyTransactionStatus,
	FRAUD_OUTCOME_BY_STATUS,
	isChallengedStatus,
	isFailedStatus,
	isFraudChallenge,
	isPendingStatus,
	isRefundedStatus,
	isSuccessStatus,
	TRANSACTION_OUTCOMES,
	TRANSACTION_STATUS_OUTCOMES,
	type TransactionOutcome,
} from "../../src/helper/status";
import {
	TransactionFraudStatusSchema,
	TransactionStatusSchema,
} from "../../src/schema";

/**
 * The exhaustive contract of the classifier: every `TransactionStatus` value,
 * with the fraud pairing that refines it.
 */
const STATUS_CASES: ReadonlyArray<
	readonly [
		status: string,
		fraud: string | undefined,
		outcome: TransactionOutcome,
		isFinal: boolean,
	]
> = [
	["authorize", undefined, "pending", false],
	["authorize", "accept", "pending", false],
	["authorize", "challenge", "challenged", false],
	["authorize", "deny", "failed", true],

	["capture", undefined, "paid", true],
	["capture", "accept", "paid", true],
	["capture", "challenge", "challenged", false],
	["capture", "deny", "failed", true],

	["settlement", undefined, "paid", true],
	["settlement", "accept", "paid", true],

	["deny", undefined, "failed", true],
	["pending", undefined, "pending", false],
	["pending", "accept", "pending", false],
	["pending", "challenge", "challenged", false],
	["pending", "deny", "failed", true],
	["cancel", undefined, "failed", true],
	["refund", undefined, "refunded", true],
	["partial_refund", undefined, "refunded", true],
	["chargeback", undefined, "refunded", true],
	["partial_chargeback", undefined, "refunded", true],
	["expire", undefined, "failed", true],
	["failure", undefined, "failed", true],
];

describe("classifyTransactionStatus", () => {
	it.each(STATUS_CASES)(
		"classifies %s with fraud status %s as %s",
		(status, fraud, outcome, isFinal) => {
			const classification = classifyTransactionStatus(status, fraud);

			expect(classification.outcome).toBe(outcome);
			expect(classification.is_final).toBe(isFinal);
			expect(classification.transaction_status).toBe(status);
			expect(classification.fraud_status).toBe(fraud);
		}
	);

	it("classifies every declared transaction status", () => {
		const covered = new Set(STATUS_CASES.map(([status]) => status));

		for (const status of TransactionStatusSchema.options) {
			expect(covered.has(status)).toBe(true);
		}
		expect(covered.size).toBe(TransactionStatusSchema.options.length);
	});

	it("never reports an unrecognised status as paid", () => {
		const classification = classifyTransactionStatus("not_a_status");

		expect(classification.outcome).toBe("unknown");
		expect(classification.is_final).toBe(false);
		expect(classification.transaction_status).toBe("not_a_status");
	});

	it("never reports an unrecognised fraud status as a confident outcome", () => {
		expect(classifyTransactionStatus("capture", "weird").outcome).toBe(
			"unknown"
		);
		expect(classifyTransactionStatus("pending", "weird").outcome).toBe(
			"unknown"
		);
		expect(classifyTransactionStatus("authorize", "weird").outcome).toBe(
			"unknown"
		);
	});

	it("keeps the upstream vocabulary untouched", () => {
		expect(TransactionStatusSchema.options).toEqual([
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
		expect(TransactionFraudStatusSchema.options).toEqual([
			"accept",
			"challenge",
			"deny",
		]);
	});
});

describe("status lookup tables", () => {
	it("covers every status that fraud cannot refine", () => {
		const refined = new Set(["capture", "authorize", "pending"]);
		const expected = TransactionStatusSchema.options.filter(
			(status) => !refined.has(status)
		);

		expect(Object.keys(TRANSACTION_STATUS_OUTCOMES).sort()).toEqual(
			[...expected].sort()
		);
	});

	it("covers every fraud status for every refinable status", () => {
		for (const status of ["capture", "authorize", "pending"] as const) {
			expect(Object.keys(FRAUD_OUTCOME_BY_STATUS[status]).sort()).toEqual(
				[...TransactionFraudStatusSchema.options].sort()
			);
		}
	});

	it("exposes exactly the declared outcome vocabulary", () => {
		expect([...TRANSACTION_OUTCOMES].sort()).toEqual([
			"challenged",
			"failed",
			"paid",
			"pending",
			"refunded",
			"unknown",
		]);
	});
});

describe("status predicates", () => {
	it("reports paid statuses", () => {
		expect(isSuccessStatus("settlement")).toBe(true);
		expect(isSuccessStatus("capture")).toBe(true);
		expect(isSuccessStatus("capture", "accept")).toBe(true);
		expect(isSuccessStatus("capture", "challenge")).toBe(false);
		expect(isSuccessStatus("capture", "deny")).toBe(false);
		expect(isSuccessStatus("pending")).toBe(false);
		expect(isSuccessStatus("failure")).toBe(false);
	});

	it("reports pending statuses", () => {
		expect(isPendingStatus("pending")).toBe(true);
		expect(isPendingStatus("authorize")).toBe(true);
		expect(isPendingStatus("settlement")).toBe(false);
		expect(isPendingStatus("pending", "challenge")).toBe(false);
	});

	it("reports failed statuses, including failure and chargeback", () => {
		expect(isFailedStatus("deny")).toBe(true);
		expect(isFailedStatus("cancel")).toBe(true);
		expect(isFailedStatus("expire")).toBe(true);
		expect(isFailedStatus("failure")).toBe(true);
		expect(isFailedStatus("pending")).toBe(false);
		expect(isFailedStatus("chargeback")).toBe(false);
	});

	it("reports refunded statuses, including chargebacks", () => {
		expect(isRefundedStatus("refund")).toBe(true);
		expect(isRefundedStatus("partial_refund")).toBe(true);
		expect(isRefundedStatus("chargeback")).toBe(true);
		expect(isRefundedStatus("partial_chargeback")).toBe(true);
		expect(isRefundedStatus("settlement")).toBe(false);
	});

	it("reports fraud challenges", () => {
		expect(isFraudChallenge("challenge")).toBe(true);
		expect(isFraudChallenge("accept")).toBe(false);
		expect(isFraudChallenge()).toBe(false);
		expect(isChallengedStatus("capture", "challenge")).toBe(true);
		expect(isChallengedStatus("pending", "challenge")).toBe(true);
		expect(isChallengedStatus("capture", "accept")).toBe(false);
	});
});
