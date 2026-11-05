import {
	formatQuotaLimit,
	formatQuotaRemaining,
	formatQuotaReset,
	formatUsageCount,
	formatUsagePeriod,
	quotaCardModel,
	quotaTone,
	usageRatio,
} from "../utils";

describe("formatUsageCount", () => {
	it("groups thousands and clamps negative values", () => {
		expect(formatUsageCount(0)).toBe("0");
		expect(formatUsageCount(1_234)).toBe("1.234");
		expect(formatUsageCount(-10)).toBe("0");
	});

	it("tolerates non-finite input", () => {
		expect(formatUsageCount(Number.NaN)).toBe("0");
		expect(formatUsageCount(Number.POSITIVE_INFINITY)).toBe("0");
	});
});

describe("usageRatio", () => {
	it("returns null for unlimited plans", () => {
		expect(usageRatio(500, null)).toBeNull();
		expect(usageRatio(500, 0)).toBeNull();
	});

	it("computes a clamped percentage", () => {
		expect(usageRatio(0, 10_000)).toBe(0);
		expect(usageRatio(5_000, 10_000)).toBe(50);
		expect(usageRatio(25_000, 10_000)).toBe(100);
	});
});

describe("quotaTone", () => {
	it("escalates with consumption", () => {
		expect(quotaTone(null)).toBe("success");
		expect(quotaTone(10)).toBe("success");
		expect(quotaTone(69.9)).toBe("success");
		expect(quotaTone(70)).toBe("warning");
		expect(quotaTone(89.9)).toBe("warning");
		expect(quotaTone(90)).toBe("danger");
		expect(quotaTone(100)).toBe("danger");
	});
});

describe("quota copy", () => {
	it("describes limited and unlimited plans", () => {
		expect(formatQuotaLimit(10_000)).toBe("10.000 requests per month");
		expect(formatQuotaLimit(null)).toBe("Unlimited monthly requests");
		expect(formatQuotaRemaining(250)).toBe("250 requests remaining");
		expect(formatQuotaRemaining(null)).toBe("No monthly cap on your plan");
	});
});

describe("formatQuotaReset", () => {
	it("formats the next period start in UTC", () => {
		const formatted = formatQuotaReset("2026-12-01T00:00:00.000Z");
		expect(formatted).not.toBe("—");
		expect(formatted).toMatch(/2026/);
	});

	it("falls back for missing or invalid timestamps", () => {
		expect(formatQuotaReset(null)).toBe("—");
		expect(formatQuotaReset(undefined)).toBe("—");
		expect(formatQuotaReset("not-a-date")).toBe("—");
	});
});

describe("formatUsagePeriod", () => {
	it("formats a YYYY-MM period", () => {
		expect(formatUsagePeriod("2026-11")).toMatch(/2026/);
		expect(formatUsagePeriod(null)).toBe("—");
	});
});

describe("quotaCardModel", () => {
	it("describes limited plans with a percentage and soft wording", () => {
		const model = quotaCardModel({
			used: 2_500,
			limit: 10_000,
			remaining: 7_500,
			reset_at: "2026-12-01T00:00:00.000Z",
			mode: "soft",
		});

		expect(model).toMatchObject({
			is_unlimited: false,
			used_label: "2.500",
			limit_label: "of 10.000 requests",
			remaining_label: "7.500 requests remaining",
			percent_label: "25% used",
			ratio: 25,
			tone: "success",
			mode_label: "Soft limit",
		});
		expect(model.reset_label).toMatch(/^Resets /);
		expect(model.copy).toMatch(/not blocked/);
	});

	it("escalates tone and wording at the hard limit", () => {
		const model = quotaCardModel({
			used: 10_000,
			limit: 10_000,
			remaining: 0,
			reset_at: "2026-12-01T00:00:00.000Z",
			mode: "hard",
		});

		expect(model.percent_label).toBe("100% used");
		expect(model.tone).toBe("danger");
		expect(model.mode_label).toBe("Hard limit");
		expect(model.copy).toMatch(/rejected/);
	});

	it("handles unlimited plans", () => {
		const model = quotaCardModel({
			used: 42,
			limit: null,
			remaining: null,
			reset_at: "2026-12-01T00:00:00.000Z",
			mode: "soft",
		});

		expect(model).toMatchObject({
			is_unlimited: true,
			used_label: "42",
			limit_label: "Unlimited",
			percent_label: null,
			ratio: null,
			tone: "success",
			remaining_label: "No monthly cap on your plan",
		});
	});
});
