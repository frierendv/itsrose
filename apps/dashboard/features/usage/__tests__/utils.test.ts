import {
	endpointBreakdownModel,
	formatQuotaLimit,
	formatQuotaRemaining,
	formatQuotaReset,
	formatUsageCount,
	formatUsagePeriod,
	quotaCardModel,
	quotaTone,
	trendCardModel,
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

describe("trendCardModel", () => {
	const points = [
		{ date: "2026-11-01", requests_total: 10, requests_ok: 8 },
		{ date: "2026-11-02", requests_total: 40, requests_ok: 30 },
		{ date: "2026-11-03", requests_total: 20, requests_ok: 20 },
	];

	it("normalizes bar heights against the busiest day", () => {
		const model = trendCardModel(points);

		expect(model.bars).toHaveLength(3);
		expect(model.bars[1]).toMatchObject({
			total_count: 40,
			billable_count: 30,
			total_pct: 100,
			billable_pct: 75,
		});
		expect(model.bars[0]?.total_pct).toBe(25);
		expect(model.total_requests).toBe(70);
		expect(model.billable_requests).toBe(58);
		expect(model.total_label).toBe("70 requests");
		expect(model.billable_label).toBe("58 billable");
		expect(model.is_empty).toBe(false);
	});

	it("labels bars with a weekday and day number", () => {
		const model = trendCardModel(points);
		expect(model.bars[0]?.label).toMatch(/\d/);
		expect(model.bars[0]?.label).not.toContain("2026");
	});

	it("clamps billable counts above total and handles empty windows", () => {
		const clamped = trendCardModel([
			{ date: "2026-11-01", requests_total: 5, requests_ok: 9 },
		]);
		expect(clamped.bars[0]?.billable_count).toBe(5);

		const empty = trendCardModel([
			{ date: "2026-11-01", requests_total: 0, requests_ok: 0 },
		]);
		expect(empty.is_empty).toBe(true);
		expect(empty.bars[0]?.total_pct).toBe(0);
		expect(empty.peak_label).toBeNull();

		expect(trendCardModel(undefined).is_empty).toBe(true);
	});
});

describe("endpointBreakdownModel", () => {
	const slices = [
		{ key: "/audio/text-to-speech", requests_ok: 300 },
		{ key: "/status", requests_ok: 500 },
		{ key: "/mtxx/remove-bg", requests_ok: 200 },
	];

	it("sorts by volume and computes shares against the full total", () => {
		const model = endpointBreakdownModel(slices, 2);

		expect(model.total_requests).toBe(1000);
		expect(model.slices).toHaveLength(2);
		expect(model.slices[0]).toMatchObject({
			key: "/status",
			requests_ok: 500,
			count_label: "500",
			share_label: "50%",
			width_pct: 100,
		});
		expect(model.slices[1]?.share_label).toBe("30%");
		expect(model.hidden_count).toBe(1);
		expect(model.total_label).toBe("1.000 requests");
	});

	it("is empty for zero traffic and missing data", () => {
		expect(endpointBreakdownModel([], 5).is_empty).toBe(true);
		expect(endpointBreakdownModel(undefined).is_empty).toBe(true);

		const zeroed = endpointBreakdownModel(
			[{ key: "/status", requests_ok: 0 }],
			5
		);
		expect(zeroed.is_empty).toBe(true);
		expect(zeroed.slices[0]?.width_pct).toBe(0);
	});

	it("falls back for a blank endpoint key", () => {
		const model = endpointBreakdownModel([{ key: "", requests_ok: 1 }], 5);
		expect(model.slices[0]?.key).toBe("(unknown)");
	});
});
