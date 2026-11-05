import type { Subscription } from "@itsrose/auth-billing";
import type { SettlementResult, UsageUnitRate } from "@itsrose/auth-usage";
import {
	buildMonthOptions,
	buildOverviewMetrics,
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

describe("buildOverviewMetrics", () => {
	const plan = {
		id: "plan-pro",
		plan_id: "pro",
		name: "Pro",
		description: null,
		price: {
			amount: 120_000,
			currency: "IDR" as const,
			interval: "month" as const,
		},
		features: [],
		limits: { max: 300, timeWindow: 60_000 },
		quota_requests: 2_000_000,
		highlighted: false,
	};
	const yearlyPlan = {
		...plan,
		id: "plan-year",
		plan_id: "yearly",
		price: {
			amount: 1_200_000,
			currency: "IDR" as const,
			interval: "year" as const,
		},
	};

	function subscription(
		partial: Partial<{
			id: string;
			status: Subscription["status"];
			plan_id: string;
			period_end: string;
		}>
	): Subscription {
		return {
			id: partial.id ?? "sub-1",
			user_id: "user-1",
			plan_id: partial.plan_id ?? "pro",
			status: partial.status ?? "active",
			period_start: "2026-11-01T00:00:00.000Z",
			period_end: partial.period_end ?? "2026-12-01T00:00:00.000Z",
			interval: "month",
		};
	}

	it("computes active counts, monthly-normalised MRR and pending totals", () => {
		const metrics = buildOverviewMetrics({
			subscriptions: [
				subscription({ id: "sub-1", status: "active", plan_id: "pro" }),
				subscription({
					id: "sub-2",
					status: "active",
					plan_id: "yearly",
				}),
				subscription({
					id: "sub-3",
					status: "past_due",
					plan_id: "pro",
				}),
			],
			invoices: [
				{
					invoice_id: "inv-1",
					order_id: "order-1",
					user_id: "user-1",
					invoice_number: "INV-1",
					invoice_type: "NEW",
					target_tier: "pro",
					status: "pending",
					invoice_date: "2026-11-01",
					due_date: "2026-11-04",
					gross_amount: 120_000,
					payment_type: "payment_link",
					item_details: [],
					customer_details: null,
				},
				{
					invoice_id: "inv-2",
					order_id: "order-2",
					user_id: "user-1",
					invoice_number: "INV-2",
					invoice_type: "RENEWAL",
					target_tier: "pro",
					status: "paid",
					invoice_date: "2026-10-01",
					due_date: "2026-10-04",
					gross_amount: 80_000,
					payment_type: "payment_link",
					item_details: [],
					customer_details: null,
				},
			],
			plans: [plan, yearlyPlan],
			events: [],
		});

		expect(metrics.active_subscriptions).toBe(2);
		expect(metrics.total_subscriptions).toBe(3);
		// 120k monthly + 1.2M yearly / 12 = 220k
		expect(metrics.mrr).toBe(220_000);
		expect(metrics.pending_invoices).toBe(1);
		expect(metrics.pending_amount).toBe(120_000);
		expect(metrics.lifetime_revenue).toBe(80_000);
		expect(metrics.attention_count).toBe(1);
		expect(metrics.attention[0]?.status).toBe("past_due");
	});

	it("flags sampled data at the cap", () => {
		const metrics = buildOverviewMetrics({
			subscriptions: [subscription({})],
			invoices: [],
			plans: [plan],
			events: [],
			cap: 1,
		});
		expect(metrics.sampled.truncated).toBe(true);
		expect(metrics.sampled.cap).toBe(1);
	});

	it("handles an empty platform", () => {
		const metrics = buildOverviewMetrics({
			subscriptions: [],
			invoices: [],
			plans: [],
			events: [],
		});
		expect(metrics.active_subscriptions).toBe(0);
		expect(metrics.mrr).toBe(0);
		expect(metrics.attention).toEqual([]);
		expect(metrics.sampled.truncated).toBe(false);
	});
});
