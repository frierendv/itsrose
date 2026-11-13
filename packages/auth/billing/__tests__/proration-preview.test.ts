import {
	calculateProrationPreview,
	isDowngrade,
	isUpgrade,
} from "../src/client/proration";
import {
	calculateProration,
	isTierDowngrade,
	isTierUpgrade,
} from "../src/domain/proration";

const NOW = new Date("2026-01-15T00:00:00.000Z");
const PERIOD_START = new Date("2026-01-01T00:00:00.000Z");
const PERIOD_END = new Date("2026-02-01T00:00:00.000Z");

const HOBBY_PRICE = 160_000;
const PRO_PRICE = 400_999;

describe("auth/billing proration preview", () => {
	describe("parity with the rule the server charges with", () => {
		it("quotes the same payable amount as the domain rule", () => {
			const preview = calculateProrationPreview({
				currentTier: "hobby",
				targetTier: "pro",
				currentTierPrice: HOBBY_PRICE,
				targetTierPrice: PRO_PRICE,
				periodStart: PERIOD_START,
				periodEnd: PERIOD_END,
				now: NOW,
			});

			const domain = calculateProration({
				currentTier: "hobby",
				targetTier: "pro",
				currentPeriodStart: PERIOD_START,
				currentPeriodEnd: PERIOD_END,
				currentTierPrice: HOBBY_PRICE,
				targetTierPrice: PRO_PRICE,
				now: NOW,
			});

			expect(preview.netPayable).toBe(domain.payableAmount);
			expect(preview.isCycleReset).toBe(domain.isCycleReset);
			expect(preview.cycleResetReason).toBe(domain.cycleResetReason);
			expect(preview.renewalDate).toEqual(
				domain.effectiveNewPeriodEnd ?? domain.currentPeriodEnd
			);
		});

		it("breaks the prorated amount into credit and cost that add up", () => {
			const preview = calculateProrationPreview({
				currentTier: "hobby",
				targetTier: "pro",
				currentTierPrice: HOBBY_PRICE,
				targetTierPrice: PRO_PRICE,
				periodStart: PERIOD_START,
				periodEnd: PERIOD_END,
				now: NOW,
			});

			expect(preview.unusedCredit).toBe(87_742);
			expect(preview.proratedTargetCost).toBe(219_903);
			expect(preview.netPayable).toBe(132_161);
			expect(preview.remainingDays).toBe(17);
			expect(preview.fullRenewalPrice).toBe(PRO_PRICE);
		});
	});

	describe("prices come from the caller, not a catalog", () => {
		it("uses the price it was given for the current tier", () => {
			const preview = calculateProrationPreview({
				currentTier: "hobby",
				targetTier: "pro",
				currentTierPrice: 1,
				targetTierPrice: PRO_PRICE,
				periodStart: PERIOD_START,
				periodEnd: PERIOD_END,
				now: NOW,
			});

			expect(preview.currentTierPrice).toBe(1);
			expect(preview.netPayable).not.toBe(132_161);
		});

		it("charges the full target price when there is no current plan to prorate against", () => {
			const preview = calculateProrationPreview({
				currentTier: "free",
				targetTier: "pro",
				currentTierPrice: 0,
				targetTierPrice: PRO_PRICE,
				now: NOW,
			});

			expect(preview.isCycleReset).toBe(true);
			expect(preview.cycleResetReason).toBe("new_subscription");
			expect(preview.netPayable).toBe(PRO_PRICE);
			expect(preview.unusedCredit).toBe(0);
			expect(preview.proratedTargetCost).toBe(0);
		});

		it("falls back to a full cycle when less than 24 hours remain", () => {
			const preview = calculateProrationPreview({
				currentTier: "hobby",
				targetTier: "pro",
				currentTierPrice: HOBBY_PRICE,
				targetTierPrice: PRO_PRICE,
				periodStart: PERIOD_START,
				periodEnd: new Date("2026-01-15T12:00:00.000Z"),
				now: NOW,
			});

			expect(preview.isCycleReset).toBe(true);
			expect(preview.cycleResetReason).toBe("under_24_hours");
			expect(preview.netPayable).toBe(PRO_PRICE);
		});
	});

	describe("tier comparison", () => {
		it("agrees with the domain's tier ranking", () => {
			expect(isUpgrade("hobby", "pro")).toBe(
				isTierUpgrade("hobby", "pro")
			);
			expect(isUpgrade("pro", "hobby")).toBe(
				isTierUpgrade("pro", "hobby")
			);
			expect(isDowngrade("pro", "hobby")).toBe(
				isTierDowngrade("pro", "hobby")
			);
			expect(isDowngrade("hobby", "pro")).toBe(
				isTierDowngrade("hobby", "pro")
			);
		});

		it("treats free as the lowest tier", () => {
			expect(isUpgrade("free", "hobby")).toBe(true);
			expect(isDowngrade("free", "hobby")).toBe(false);
			expect(isDowngrade("hobby", "free")).toBe(true);
		});
	});
});
