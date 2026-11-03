import {
	BILLING_PERIOD_MS,
	PLAN_TIER_RANK,
	STANDARD_TIER_RATES,
	UNDER_24_HOURS_MS,
} from "../domain/constants";
import type { PlanTier } from "../types";

export const BILLING_CYCLE_MS = BILLING_PERIOD_MS;
export { UNDER_24_HOURS_MS };

export interface ProrationPreviewInput {
	currentTier: string;
	targetTier: string;
	periodStart?: string | Date | null;
	periodEnd?: string | Date | null;
	currentTierPrice?: number;
	targetTierPrice?: number;
	now?: Date;
}
export interface ProrationPreviewResult {
	currentTier: string;
	targetTier: string;
	currentTierPrice: number;
	targetTierPrice: number;
	unusedCredit: number;
	proratedTargetCost: number;
	netPayable: number;
	isCycleReset: boolean;
	cycleResetReason?: string;
	remainingDays: number;
	renewalDate: Date;
	fullRenewalPrice: number;
}

/**
 * Computes live mathematical proration breakdown matching the server billing engine.
 */
export function calculateProrationPreview(
	params: ProrationPreviewInput
): ProrationPreviewResult {
	const now = params.now ?? new Date();
	const currentTier = params.currentTier.toLowerCase();
	const targetTier = params.targetTier.toLowerCase();

	const currentTierPrice =
		params.currentTierPrice ??
		(STANDARD_TIER_RATES[currentTier as PlanTier] || 0);
	const targetTierPrice =
		params.targetTierPrice ??
		(STANDARD_TIER_RATES[targetTier as PlanTier] || 0);

	const periodStart = params.periodStart ? new Date(params.periodStart) : now;
	const periodEnd = params.periodEnd
		? new Date(params.periodEnd)
		: new Date(now.getTime() + BILLING_CYCLE_MS);

	const nowMs = now.getTime();
	const startMs = periodStart.getTime();
	const endMs = periodEnd.getTime();

	// If currently on free tier or invalid range, treat as full new cycle
	if (currentTier === "free" || currentTierPrice <= 0 || endMs <= startMs) {
		const renewalDate = new Date(nowMs + BILLING_CYCLE_MS);
		return {
			currentTier,
			targetTier,
			currentTierPrice: 0,
			targetTierPrice,
			unusedCredit: 0,
			proratedTargetCost: targetTierPrice,
			netPayable: targetTierPrice,
			isCycleReset: true,
			cycleResetReason: "new_subscription",
			remainingDays: 30,
			renewalDate,
			fullRenewalPrice: targetTierPrice,
		};
	}

	const totalPeriodMs = Math.max(endMs - startMs, 1);
	const remainingMs = Math.max(endMs - nowMs, 0);
	const remainingDays = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
	const ratio = remainingMs / totalPeriodMs;

	// Edge case 1: Remaining time under 24 hours -> Full cycle reset
	if (remainingMs < UNDER_24_HOURS_MS) {
		const renewalDate = new Date(nowMs + BILLING_CYCLE_MS);
		return {
			currentTier,
			targetTier,
			currentTierPrice,
			targetTierPrice,
			unusedCredit: 0,
			proratedTargetCost: targetTierPrice,
			netPayable: targetTierPrice,
			isCycleReset: true,
			cycleResetReason: "under_24_hours",
			remainingDays,
			renewalDate,
			fullRenewalPrice: targetTierPrice,
		};
	}

	const unusedCredit = Math.round(currentTierPrice * ratio);
	const proratedTargetCost = Math.round(targetTierPrice * ratio);
	const priceDifference = targetTierPrice - currentTierPrice;
	const rawPayable = Math.round(priceDifference * ratio);

	// Edge case 2: Trivial payable amount -> Full cycle reset
	if (rawPayable <= 0) {
		const renewalDate = new Date(nowMs + BILLING_CYCLE_MS);
		return {
			currentTier,
			targetTier,
			currentTierPrice,
			targetTierPrice,
			unusedCredit: 0,
			proratedTargetCost: targetTierPrice,
			netPayable: targetTierPrice,
			isCycleReset: true,
			cycleResetReason: "trivial_payable",
			remainingDays,
			renewalDate,
			fullRenewalPrice: targetTierPrice,
		};
	}

	return {
		currentTier,
		targetTier,
		currentTierPrice,
		targetTierPrice,
		unusedCredit,
		proratedTargetCost,
		netPayable: rawPayable,
		isCycleReset: false,
		remainingDays,
		renewalDate: periodEnd,
		fullRenewalPrice: targetTierPrice,
	};
}

export function isUpgrade(currentTier: string, targetTier: string): boolean {
	const currentRank = PLAN_TIER_RANK[currentTier.toLowerCase()] ?? 0;
	const targetRank = PLAN_TIER_RANK[targetTier.toLowerCase()] ?? 0;
	return targetRank > currentRank;
}

export function isDowngrade(currentTier: string, targetTier: string): boolean {
	const currentRank = PLAN_TIER_RANK[currentTier.toLowerCase()] ?? 0;
	const targetRank = PLAN_TIER_RANK[targetTier.toLowerCase()] ?? 0;
	return targetRank < currentRank;
}
