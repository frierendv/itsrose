import type { ProrationDetails } from "../types";
import {
	BILLING_PERIOD_MS,
	PLAN_TIER_RANK,
	UNDER_24_HOURS_MS,
} from "./constants";

export interface ProrationInput {
	currentTier: string;
	targetTier: string;
	currentPeriodStart: Date | string | number;
	currentPeriodEnd: Date | string | number;
	currentTierPrice: number;
	targetTierPrice: number;
	now?: Date | string | number;
}
export interface ProrationResult {
	currentTier: string;
	targetTier: string;
	currentPeriodStart: Date;
	currentPeriodEnd: Date;
	totalPeriodMs: number;
	remainingMs: number;
	currentTierPrice: number;
	targetTierPrice: number;
	priceDifference: number;
	payableAmount: number;
	isCycleReset: boolean;
	cycleResetReason?:
		"under_24_hours" | "trivial_payable" | "new_subscription";
	effectiveNewPeriodEnd?: Date;
}
/**
 * Validates whether the transition from currentTier to targetTier is an upgrade.
 */
export function isTierUpgrade(
	currentTier: string,
	targetTier: string
): boolean {
	const currentRank = PLAN_TIER_RANK[currentTier.toLowerCase()] ?? 0;
	const targetRank = PLAN_TIER_RANK[targetTier.toLowerCase()] ?? 0;
	return targetRank > currentRank;
}
/**
 * Validates whether the transition from currentTier to targetTier is a downgrade.
 */
export function isTierDowngrade(
	currentTier: string,
	targetTier: string
): boolean {
	const currentRank = PLAN_TIER_RANK[currentTier.toLowerCase()] ?? 0;
	const targetRank = PLAN_TIER_RANK[targetTier.toLowerCase()] ?? 0;
	return targetRank < currentRank;
}

/**
 * Calculates mid-cycle prorated upgrade payment amount and period adjustments.
 *
 * Formula:
 * Payable = round((P_target - P_current) * (remaining_ms / total_period_ms))
 *
 * Edge cases:
 * - If remaining time is under 24 hours, perform a full cycle reset:
 *   charge full target tier price and extend period 30 days from now.
 * - If calculated payable is trivial (<= 0), perform a full cycle reset.
 * - If current tier is "free" or starting a new subscription, charge full target tier price.
 */
export function calculateProration(input: ProrationInput): ProrationResult {
	const now = input.now ? new Date(input.now) : new Date();
	const currentPeriodStart = new Date(input.currentPeriodStart);
	const currentPeriodEnd = new Date(input.currentPeriodEnd);
	const nowMs = now.getTime();
	const startMs = currentPeriodStart.getTime();
	const endMs = currentPeriodEnd.getTime();
	// If current tier is free or has no valid billing period, treat as new subscription cycle
	if (
		input.currentTier.toLowerCase() === "free" ||
		input.currentTierPrice <= 0 ||
		endMs <= startMs
	) {
		const newPeriodEnd = new Date(nowMs + BILLING_PERIOD_MS);
		return {
			currentTier: input.currentTier,
			targetTier: input.targetTier,
			currentPeriodStart: now,
			currentPeriodEnd,
			totalPeriodMs: BILLING_PERIOD_MS,
			remainingMs: BILLING_PERIOD_MS,
			currentTierPrice: input.currentTierPrice,
			targetTierPrice: input.targetTierPrice,
			priceDifference: input.targetTierPrice - input.currentTierPrice,
			payableAmount: Math.round(input.targetTierPrice),
			isCycleReset: true,
			cycleResetReason: "new_subscription",
			effectiveNewPeriodEnd: newPeriodEnd,
		};
	}

	const totalPeriodMs = Math.max(endMs - startMs, 1);
	const remainingMs = Math.max(endMs - nowMs, 0);
	const priceDifference = input.targetTierPrice - input.currentTierPrice;

	// Edge case 1: Remaining time under 24 hours -> Full cycle reset
	if (remainingMs < UNDER_24_HOURS_MS) {
		const newPeriodEnd = new Date(nowMs + BILLING_PERIOD_MS);
		return {
			currentTier: input.currentTier,
			targetTier: input.targetTier,
			currentPeriodStart,
			currentPeriodEnd,
			totalPeriodMs,
			remainingMs,
			currentTierPrice: input.currentTierPrice,
			targetTierPrice: input.targetTierPrice,
			priceDifference,
			payableAmount: Math.round(input.targetTierPrice),
			isCycleReset: true,
			cycleResetReason: "under_24_hours",
			effectiveNewPeriodEnd: newPeriodEnd,
		};
	}

	// Normal mid-cycle prorated calculation
	const rawPayable = priceDifference * (remainingMs / totalPeriodMs);
	const payableAmount = Math.round(rawPayable);
	// Edge case 2: Trivial payable amount (<= 0) -> Full cycle reset
	if (payableAmount <= 0) {
		const newPeriodEnd = new Date(nowMs + BILLING_PERIOD_MS);
		return {
			currentTier: input.currentTier,
			targetTier: input.targetTier,
			currentPeriodStart,
			currentPeriodEnd,
			totalPeriodMs,
			remainingMs,
			currentTierPrice: input.currentTierPrice,
			targetTierPrice: input.targetTierPrice,
			priceDifference,
			payableAmount: Math.round(input.targetTierPrice),
			isCycleReset: true,
			cycleResetReason: "trivial_payable",
			effectiveNewPeriodEnd: newPeriodEnd,
		};
	}

	// Regular prorated upgrade: keep cycle anchor (currentPeriodEnd does NOT change)
	return {
		currentTier: input.currentTier,
		targetTier: input.targetTier,
		currentPeriodStart,
		currentPeriodEnd,
		totalPeriodMs,
		remainingMs,
		currentTierPrice: input.currentTierPrice,
		targetTierPrice: input.targetTierPrice,
		priceDifference,
		payableAmount,
		isCycleReset: false,
	};
}

/**
 * Converts a ProrationResult into a serializable ProrationDetails audit object.
 */
export function formatProrationDetails(
	result: ProrationResult
): ProrationDetails {
	return {
		current_tier: result.currentTier,
		target_tier: result.targetTier,
		current_period_start: result.currentPeriodStart.toISOString(),
		current_period_end: result.currentPeriodEnd.toISOString(),
		total_period_ms: result.totalPeriodMs,
		remaining_ms: result.remainingMs,
		current_tier_price: result.currentTierPrice,
		target_tier_price: result.targetTierPrice,
		price_difference: result.priceDifference,
		payable_amount: result.payableAmount,
		is_cycle_reset: result.isCycleReset,
		cycle_reset_reason: result.cycleResetReason,
	};
}
