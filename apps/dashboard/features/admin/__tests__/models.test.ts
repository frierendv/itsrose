import type { SettlementResult, UsageUnitRate } from "@itsrose/auth-usage";
import {
	buildMonthOptions,
	buildRateGroups,
	buildSettlementSummary,
} from "../models";

function rate(
	partial: Partial<UsageUnitRate> & {
		plan_tier: string;
		rates_version: number;
	}
): UsageUnitRate {
	return {
		id: `rate-${partial.rates_version}`,
		unit: "request",
		amount: 0,
		currency: "IDR",
		effective_from: "2026-01-01T00:00:00.000Z",
		effective_to: null,
		...partial,
	};
}

describe("buildRateGroups", () => {
	it("groups versions per tier with the open row first", () => {
		const groups = buildRateGroups([
			rate({
				plan_tier: "pro",
				rates_version: 1,
				effective_to: "2026-02-01T00:00:00.000Z",
			}),
			rate({ plan_tier: "pro", rates_version: 2, amount: 5 }),
			rate({ plan_tier: "free", rates_version: 1 }),
		]);

		expect(groups.map((group) => group.plan_tier)).toEqual(["free", "pro"]);
		const pro = groups.find((group) => group.plan_tier === "pro");
		expect(pro?.open_rate?.rates_version).toBe(2);
		expect(pro?.history.map((item) => item.rates_version)).toEqual([2, 1]);
		expect(pro?.has_conflict).toBe(false);
	});

	it("flags two open versions for the same tier", () => {
		const groups = buildRateGroups([
			rate({ plan_tier: "pro", rates_version: 1 }),
			rate({ plan_tier: "pro", rates_version: 2 }),
		]);
		expect(groups[0]?.has_conflict).toBe(true);
	});

	it("handles an empty catalog", () => {
		expect(buildRateGroups([])).toEqual([]);
	});
});

function settlementResult(
	tenants: SettlementResult["tenants"]
): SettlementResult {
	return {
		period: "2026-10",
		unit: "request",
		tenants,
		totals: {
			tenants: tenants.length,
			units_micro: 2_500_000,
			amount: 1_500,
			invoices_created: 1,
			skipped: tenants.filter((t) => t.status === "skipped").length,
			failed: tenants.filter((t) => t.status === "failed").length,
		},
	};
}

const settledTenant: SettlementResult["tenants"][number] = {
	tenant_id: "t-1",
	plan_tier: "pro",
	requests: 2,
	units_micro: 2_000_000,
	amount: 1_000,
	unit_rate_id: "r-1",
	rates_version: 1,
	status: "settled",
	created: true,
	invoice_id: "inv-1",
};

describe("buildSettlementSummary", () => {
	it("summarizes totals and keeps only problematic rows", () => {
		const summary = buildSettlementSummary(
			settlementResult([
				settledTenant,
				{
					...settledTenant,
					tenant_id: "t-2",
					status: "skipped",
					reason: "rate_missing",
					created: false,
				},
				{
					...settledTenant,
					tenant_id: "t-3",
					status: "failed",
					reason: "db down",
					created: false,
				},
			])
		);

		expect(summary).toMatchObject({
			period: "2026-10",
			tenant_count: 3,
			units_label: "2,5",
			invoices_created: 1,
			skipped: 1,
			failed: 1,
			is_clean: false,
		});
		expect(summary.problems).toHaveLength(2);
		expect(summary.problems[1]?.reason).toBe("db down");
	});

	it("reports a clean run", () => {
		const summary = buildSettlementSummary(
			settlementResult([settledTenant])
		);
		expect(summary.is_clean).toBe(true);
		expect(summary.problems).toEqual([]);
	});
});

describe("buildMonthOptions", () => {
	it("returns recent UTC months newest first", () => {
		const options = buildMonthOptions(
			new Date("2026-01-15T00:00:00.000Z"),
			3
		);
		expect(options.map((option) => option.id)).toEqual([
			"2026-01",
			"2025-12",
			"2025-11",
		]);
		expect(options[0]?.label).toMatch(/2026/);
	});
});
