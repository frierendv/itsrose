import {
	calculateProration,
	isTierDowngrade,
	isTierUpgrade,
} from "../domain/proration";

const DAY_MS = 24 * 60 * 60 * 1000;

export interface ProrationPreviewInput {
	currentTier: string;
	targetTier: string;
	/**
	 * Price of the plan the customer is on right now, in the smallest unit.
	 * Must be the plan's current price — a plan's price is mutable, so a
	 * catalog or seeded value here would quote a different number than the
	 * customer is charged.
	 */
	currentTierPrice: number;
	/**
	 * Price of the plan being moved to, in the smallest unit.
	 */
	targetTierPrice: number;
	periodStart?: string | Date | null;
	periodEnd?: string | Date | null;
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
 * Projects the proration rule for the browser.
 *
 * The rule itself lives in `domain/proration.ts` — the server charges with it.
 * This is a view over that rule's result, not a second implementation of it,
 * so the number the customer is quoted and the number the server charges come
 * from the same decision.
 */
export function calculateProrationPreview(
	params: ProrationPreviewInput
): ProrationPreviewResult {
	const now = params.now ?? new Date();
	const currentTier = params.currentTier.toLowerCase();
	const targetTier = params.targetTier.toLowerCase();

	// Without a billing period there is nothing to prorate against; an empty
	// range puts the rule on its new-subscription branch.
	const periodStart = params.periodStart ? new Date(params.periodStart) : now;
	const periodEnd = params.periodEnd
		? new Date(params.periodEnd)
		: periodStart;

	const result = calculateProration({
		currentTier,
		targetTier,
		currentPeriodStart: periodStart,
		currentPeriodEnd: periodEnd,
		currentTierPrice: params.currentTierPrice,
		targetTierPrice: params.targetTierPrice,
		now,
	});

	const ratio =
		result.totalPeriodMs > 0
			? result.remainingMs / result.totalPeriodMs
			: 0;

	return {
		currentTier,
		targetTier,
		currentTierPrice: result.currentTierPrice,
		targetTierPrice: result.targetTierPrice,
		unusedCredit: result.isCycleReset
			? 0
			: Math.round(result.currentTierPrice * ratio),
		proratedTargetCost: result.isCycleReset
			? 0
			: Math.round(result.targetTierPrice * ratio),
		netPayable: result.payableAmount,
		isCycleReset: result.isCycleReset,
		cycleResetReason: result.cycleResetReason,
		remainingDays: Math.ceil(result.remainingMs / DAY_MS),
		renewalDate: result.effectiveNewPeriodEnd ?? result.currentPeriodEnd,
		fullRenewalPrice: result.targetTierPrice,
	};
}

/**
 * Whether moving from `currentTier` to `targetTier` is an upgrade.
 */
export function isUpgrade(currentTier: string, targetTier: string): boolean {
	return isTierUpgrade(currentTier, targetTier);
}

/**
 * Whether moving from `currentTier` to `targetTier` is a downgrade.
 */
export function isDowngrade(currentTier: string, targetTier: string): boolean {
	return isTierDowngrade(currentTier, targetTier);
}
