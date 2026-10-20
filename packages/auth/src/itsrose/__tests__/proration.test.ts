import {
	BILLING_PERIOD_MS,
	BUSINESS_PLAN,
	HOBBY_PLAN,
	PRO_PLAN,
} from "../server/constants";
import {
	calculateProration,
	formatProrationDetails,
	isTierDowngrade,
	isTierUpgrade,
} from "../server/proration";

describe("Proration Math & Rules", () => {
	// Plan prices (IDR)
	const HOBBY_PRICE = HOBBY_PLAN.price.amount;
	const PRO_PRICE = PRO_PLAN.price.amount;
	const BUSINESS_PRICE = BUSINESS_PLAN.price.amount;

	describe("Tier Rank Comparisons", () => {
		test("identifies upgrades correctly", () => {
			expect(isTierUpgrade("free", "hobby")).toBe(true);
			expect(isTierUpgrade("hobby", "pro")).toBe(true);
			expect(isTierUpgrade("pro", "business")).toBe(true);
			expect(isTierUpgrade("hobby", "business")).toBe(true);

			// Non-upgrades
			expect(isTierUpgrade("pro", "pro")).toBe(false);
			expect(isTierUpgrade("pro", "hobby")).toBe(false);
			expect(isTierUpgrade("business", "free")).toBe(false);
		});

		test("identifies downgrades correctly", () => {
			expect(isTierDowngrade("business", "pro")).toBe(true);
			expect(isTierDowngrade("pro", "hobby")).toBe(true);
			expect(isTierDowngrade("hobby", "free")).toBe(true);
			expect(isTierDowngrade("business", "free")).toBe(true);

			// Non-downgrades
			expect(isTierDowngrade("hobby", "hobby")).toBe(false);
			expect(isTierDowngrade("hobby", "pro")).toBe(false);
		});
	});

	describe("Proration Across Day Offsets", () => {
		const cycleStart = new Date("2026-10-01T00:00:00.000Z");
		const cycleEnd = new Date(cycleStart.getTime() + BILLING_PERIOD_MS); // 30 days later

		test("Day 10 offset (20 days remaining out of 30): Hobby -> Pro", () => {
			// Elapsed: 10 days, Remaining: 20 days
			const day10 = new Date(
				cycleStart.getTime() + 10 * 24 * 60 * 60 * 1000
			);
			const result = calculateProration({
				currentTier: "hobby",
				targetTier: "pro",
				currentPeriodStart: cycleStart,
				currentPeriodEnd: cycleEnd,
				currentTierPrice: HOBBY_PRICE,
				targetTierPrice: PRO_PRICE,
				now: day10,
			});

			// Net difference = 160,000 - 60,000 = 100,000 IDR
			// remaining_ms / total_period_ms = 20 / 30 = 2/3
			// Payable = round(100,000 * 20 / 30) = round(66666.666...) = 66,667 IDR
			expect(result.isCycleReset).toBe(false);
			expect(result.priceDifference).toBe(100_000);
			expect(result.payableAmount).toBe(66_667);
			expect(result.currentPeriodEnd.getTime()).toBe(cycleEnd.getTime());
		});

		test("Day 15 offset (15 days remaining out of 30, exact half cycle): Hobby -> Pro", () => {
			const day15 = new Date(
				cycleStart.getTime() + 15 * 24 * 60 * 60 * 1000
			);
			const result = calculateProration({
				currentTier: "hobby",
				targetTier: "pro",
				currentPeriodStart: cycleStart,
				currentPeriodEnd: cycleEnd,
				currentTierPrice: HOBBY_PRICE,
				targetTierPrice: PRO_PRICE,
				now: day15,
			});

			// Net difference = 100,000 IDR
			// Remaining fraction = 15 / 30 = 0.5
			// Payable = round(100,000 * 0.5) = 50,000 IDR
			expect(result.isCycleReset).toBe(false);
			expect(result.priceDifference).toBe(100_000);
			expect(result.payableAmount).toBe(50_000);
		});

		test("Day 15 offset: Pro -> Business (fractional with odd IDR)", () => {
			const day15 = new Date(
				cycleStart.getTime() + 15 * 24 * 60 * 60 * 1000
			);
			const result = calculateProration({
				currentTier: "pro",
				targetTier: "business",
				currentPeriodStart: cycleStart,
				currentPeriodEnd: cycleEnd,
				currentTierPrice: PRO_PRICE,
				targetTierPrice: BUSINESS_PRICE, // 400,999
				now: day15,
			});

			// Net difference = 400,999 - 160,000 = 240,999 IDR
			// Payable = round(240,999 * 0.5) = round(120499.5) = 120,500 IDR
			expect(result.isCycleReset).toBe(false);
			expect(result.priceDifference).toBe(240_999);
			expect(result.payableAmount).toBe(120_500);
		});

		test("Day 20 offset (10 days remaining): Hobby -> Business", () => {
			const day20 = new Date(
				cycleStart.getTime() + 20 * 24 * 60 * 60 * 1000
			);
			const result = calculateProration({
				currentTier: "hobby",
				targetTier: "business",
				currentPeriodStart: cycleStart,
				currentPeriodEnd: cycleEnd,
				currentTierPrice: HOBBY_PRICE,
				targetTierPrice: BUSINESS_PRICE,
				now: day20,
			});

			// Net difference = 400,999 - 60,000 = 340,999 IDR
			// Remaining fraction = 10 / 30 = 1/3
			// Payable = round(340,999 / 3) = round(113666.333...) = 113,666 IDR
			expect(result.isCycleReset).toBe(false);
			expect(result.payableAmount).toBe(113_666);
		});
	});

	describe("Edge Cases & Full Cycle Resets", () => {
		const cycleStart = new Date("2026-10-01T00:00:00.000Z");
		const cycleEnd = new Date(cycleStart.getTime() + BILLING_PERIOD_MS);

		test("Day 29.5 offset (12 hours remaining, under 24 hours): triggers full cycle reset", () => {
			// Remaining time: 12 hours (< 24 hours)
			const day29AndHalf = new Date(
				cycleEnd.getTime() - 12 * 60 * 60 * 1000
			);
			const result = calculateProration({
				currentTier: "hobby",
				targetTier: "pro",
				currentPeriodStart: cycleStart,
				currentPeriodEnd: cycleEnd,
				currentTierPrice: HOBBY_PRICE,
				targetTierPrice: PRO_PRICE,
				now: day29AndHalf,
			});

			expect(result.isCycleReset).toBe(true);
			expect(result.cycleResetReason).toBe("under_24_hours");
			// Charges full target tier
			expect(result.payableAmount).toBe(PRO_PRICE);
			// Extends period 30 days from now
			expect(result.effectiveNewPeriodEnd?.getTime()).toBe(
				day29AndHalf.getTime() + BILLING_PERIOD_MS
			);
		});

		test("Day 29 offset (exact 23 hours remaining, under 24 hours): triggers full cycle reset", () => {
			const under24h = new Date(cycleEnd.getTime() - 23 * 60 * 60 * 1000);
			const result = calculateProration({
				currentTier: "pro",
				targetTier: "business",
				currentPeriodStart: cycleStart,
				currentPeriodEnd: cycleEnd,
				currentTierPrice: PRO_PRICE,
				targetTierPrice: BUSINESS_PRICE,
				now: under24h,
			});

			expect(result.isCycleReset).toBe(true);
			expect(result.cycleResetReason).toBe("under_24_hours");
			expect(result.payableAmount).toBe(BUSINESS_PRICE);
		});

		test("Upgrade from Free tier (or new subscription): triggers new_subscription cycle reset", () => {
			const now = new Date("2026-10-15T12:00:00.000Z");
			const result = calculateProration({
				currentTier: "free",
				targetTier: "hobby",
				currentPeriodStart: now,
				currentPeriodEnd: now,
				currentTierPrice: 0,
				targetTierPrice: HOBBY_PRICE,
				now,
			});

			expect(result.isCycleReset).toBe(true);
			expect(result.cycleResetReason).toBe("new_subscription");
			expect(result.payableAmount).toBe(HOBBY_PRICE);
			expect(result.effectiveNewPeriodEnd?.getTime()).toBe(
				now.getTime() + BILLING_PERIOD_MS
			);
		});
	});

	describe("Audit Formatting", () => {
		test("formatProrationDetails outputs all audit keys as serializable primitives", () => {
			const cycleStart = new Date("2026-10-01T00:00:00.000Z");
			const cycleEnd = new Date(cycleStart.getTime() + BILLING_PERIOD_MS);
			const day15 = new Date(
				cycleStart.getTime() + 15 * 24 * 60 * 60 * 1000
			);

			const result = calculateProration({
				currentTier: "hobby",
				targetTier: "pro",
				currentPeriodStart: cycleStart,
				currentPeriodEnd: cycleEnd,
				currentTierPrice: HOBBY_PRICE,
				targetTierPrice: PRO_PRICE,
				now: day15,
			});

			const details = formatProrationDetails(result);

			expect(details.current_tier).toBe("hobby");
			expect(details.target_tier).toBe("pro");
			expect(details.current_period_start).toBe(cycleStart.toISOString());
			expect(details.current_period_end).toBe(cycleEnd.toISOString());
			expect(details.total_period_ms).toBe(BILLING_PERIOD_MS);
			expect(details.remaining_ms).toBe(15 * 24 * 60 * 60 * 1000);
			expect(details.current_tier_price).toBe(HOBBY_PRICE);
			expect(details.target_tier_price).toBe(PRO_PRICE);
			expect(details.price_difference).toBe(100_000);
			expect(details.payable_amount).toBe(50_000);
			expect(details.is_cycle_reset).toBe(false);
		});
	});
});
