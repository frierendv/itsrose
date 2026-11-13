import { settleUsagePeriod } from "../src/application/settlement";
import type {
	UsageInvoicePort,
	UsageLedgerPort,
	UsagePlanPort,
	UsageRateStorePort,
	UsageSettlement,
	UsageTenantPeriod,
	UsageUnitRate,
} from "../src/types";

const NOW = new Date("2026-03-15T00:00:00.000Z");
const PERIOD = "2026-02";

function rate(overrides: Partial<UsageUnitRate> = {}): UsageUnitRate {
	return {
		id: "rate_1",
		unit: "request",
		plan_tier: "pro",
		amount: 1000,
		currency: "IDR",
		rates_version: 100,
		effective_from: "2026-01-01T00:00:00.000Z",
		effective_to: null,
		...overrides,
	};
}

function tenantPeriod(
	overrides: Partial<UsageTenantPeriod> = {}
): UsageTenantPeriod {
	return {
		tenant_id: "tenant_1",
		requests_total: 10,
		requests_ok: 8,
		units_micro: 2_500_000,
		fallback_requests_ok: 0,
		fallback_units_micro: 0,
		latency_ms_sum: 1200,
		...overrides,
	};
}

function ledger(overrides: Partial<UsageLedgerPort> = {}): UsageLedgerPort {
	return {
		upsertRollups: async () => 0,
		readPeriod: async () => [],
		listTenantsWithUsage: async () => [tenantPeriod()],
		insertSettlement: async (settlement: UsageSettlement) => ({
			settlement,
			created: true,
		}),
		listSettlements: async () => [],
		updateSettlementInvoice: async () => {},
		...overrides,
	};
}

function rates(
	overrides: Partial<UsageRateStorePort> = {}
): UsageRateStorePort {
	return {
		resolveAt: async () => rate(),
		listOpen: async () => [],
		setRate: async () => rate(),
		listWeights: async () => [],
		ensureDefaults: async () => {},
		...overrides,
	};
}

function plans(overrides: Partial<UsagePlanPort> = {}): UsagePlanPort {
	return {
		forTenant: async (tenant_id: string) => ({
			tenant_id,
			user_id: "user_1",
			plan_tier: "pro",
			quota_requests: null,
		}),
		...overrides,
	};
}

function invoice(overrides: Partial<UsageInvoicePort> = {}): UsageInvoicePort {
	return {
		create: async () => ({ invoice_id: "inv_1" }),
		...overrides,
	};
}

describe("auth/usage settlement", () => {
	it("settles a tenant and totals the period", async () => {
		const result = await settleUsagePeriod({
			ledger: ledger(),
			rates: rates(),
			plans: plans(),
			period: PERIOD,
			now: () => NOW,
		});

		expect(result.period).toBe(PERIOD);
		expect(result.unit).toBe("request");
		expect(result.tenants).toHaveLength(1);
		expect(result.tenants[0]).toMatchObject({
			tenant_id: "tenant_1",
			plan_tier: "pro",
			status: "settled",
			requests: 8,
			units_micro: 2_500_000,
			amount: 2500,
			unit_rate_id: "rate_1",
			rates_version: 100,
			created: true,
			invoice_id: null,
		});
		expect(result.totals).toEqual({
			tenants: 1,
			units_micro: 2_500_000,
			amount: 2500,
			invoices_created: 0,
			skipped: 0,
			failed: 0,
		});
	});

	it("resolves the rate as of the start of the period", async () => {
		const resolveAt = jest.fn(async () => rate());

		await settleUsagePeriod({
			ledger: ledger(),
			rates: rates({ resolveAt }),
			plans: plans(),
			period: PERIOD,
			now: () => NOW,
		});

		expect(resolveAt).toHaveBeenCalledWith(
			"pro",
			"request",
			new Date("2026-02-01T00:00:00.000Z")
		);
	});

	it("falls back to the tenant row when the per-endpoint numbers are empty", async () => {
		const result = await settleUsagePeriod({
			ledger: ledger({
				listTenantsWithUsage: async () => [
					tenantPeriod({
						requests_ok: 0,
						units_micro: 0,
						fallback_requests_ok: 6,
						fallback_units_micro: 1_000_000,
					}),
				],
			}),
			rates: rates(),
			plans: plans(),
			period: PERIOD,
			now: () => NOW,
		});

		expect(result.tenants[0]).toMatchObject({
			requests: 6,
			units_micro: 1_000_000,
			amount: 1000,
			status: "settled",
		});
	});

	it("skips a tenant whose plan cannot be resolved", async () => {
		const result = await settleUsagePeriod({
			ledger: ledger(),
			rates: rates(),
			plans: plans({ forTenant: async () => null }),
			period: PERIOD,
			now: () => NOW,
		});

		expect(result.tenants[0]).toMatchObject({
			status: "skipped",
			reason: "tenant_not_resolved",
			amount: 0,
			created: false,
		});
		expect(result.totals.skipped).toBe(1);
		expect(result.totals.amount).toBe(0);
	});

	it("skips a tenant that has no rate", async () => {
		const result = await settleUsagePeriod({
			ledger: ledger(),
			rates: rates({ resolveAt: async () => null }),
			plans: plans(),
			period: PERIOD,
			now: () => NOW,
		});

		expect(result.tenants[0]).toMatchObject({
			status: "skipped",
			reason: "rate_missing",
		});
		expect(result.totals.skipped).toBe(1);
	});

	it("isolates a failing tenant and keeps settling the others", async () => {
		const result = await settleUsagePeriod({
			ledger: ledger({
				listTenantsWithUsage: async () => [
					tenantPeriod({ tenant_id: "tenant_bad" }),
					tenantPeriod({ tenant_id: "tenant_ok" }),
				],
			}),
			rates: rates({
				resolveAt: async (plan_tier: string) => {
					if (plan_tier === "broken") {
						throw new Error("rate table unavailable");
					}
					return rate();
				},
			}),
			plans: plans({
				forTenant: async (tenant_id: string) => ({
					tenant_id,
					user_id: "user_1",
					plan_tier: tenant_id === "tenant_bad" ? "broken" : "pro",
					quota_requests: null,
				}),
			}),
			period: PERIOD,
			now: () => NOW,
		});

		expect(result.tenants[0]).toMatchObject({
			tenant_id: "tenant_bad",
			status: "failed",
			reason: "rate table unavailable",
		});
		expect(result.tenants[1]).toMatchObject({
			tenant_id: "tenant_ok",
			status: "settled",
		});
		expect(result.totals.failed).toBe(1);
		expect(result.totals.amount).toBe(2500);
	});

	it("records a failure when the settlement cannot be written", async () => {
		const result = await settleUsagePeriod({
			ledger: ledger({
				insertSettlement: async () => {
					throw new Error("write failed");
				},
			}),
			rates: rates(),
			plans: plans(),
			period: PERIOD,
			now: () => NOW,
		});

		expect(result.tenants[0]).toMatchObject({
			status: "failed",
			reason: "write failed",
		});
		expect(result.totals.failed).toBe(1);
	});

	it("is a dry run unless invoices are requested", async () => {
		const create = jest.fn(async () => ({ invoice_id: "inv_1" }));

		const result = await settleUsagePeriod({
			ledger: ledger(),
			rates: rates(),
			plans: plans(),
			invoice: invoice({ create }),
			period: PERIOD,
			now: () => NOW,
		});

		expect(create).not.toHaveBeenCalled();
		expect(result.totals.invoices_created).toBe(0);
	});

	it("creates an invoice with a stable idempotency key and records it", async () => {
		const create = jest.fn(async () => ({ invoice_id: "inv_1" }));
		const updateSettlementInvoice = jest.fn(async () => {});

		const result = await settleUsagePeriod({
			ledger: ledger({ updateSettlementInvoice }),
			rates: rates(),
			plans: plans(),
			invoice: invoice({ create }),
			create_invoices: true,
			period: PERIOD,
			now: () => NOW,
		});

		expect(create).toHaveBeenCalledTimes(1);
		expect(create).toHaveBeenCalledWith({
			tenant_id: "tenant_1",
			user_id: "user_1",
			period: PERIOD,
			unit: "request",
			amount: 2500,
			lines: [
				{
					item_id: "usage:request:2026-02",
					description: "API usage 2026-02 — 8 request(s)",
					price: 2500,
					quantity: 1,
				},
			],
			idempotency_key: "usage:tenant_1:2026-02:request",
			notes: "Usage settlement for 2026-02",
		});
		expect(updateSettlementInvoice).toHaveBeenCalledWith(
			"tenant_1",
			PERIOD,
			"request",
			"inv_1"
		);
		expect(result.totals.invoices_created).toBe(1);
		expect(result.tenants[0]).toMatchObject({ invoice_id: "inv_1" });
	});

	it("issues the missing invoice on a retry, but never a second one", async () => {
		const create = jest.fn(async () => ({ invoice_id: "inv_retry" }));

		const retry = await settleUsagePeriod({
			ledger: ledger({
				insertSettlement: async (settlement: UsageSettlement) => ({
					settlement,
					created: false,
				}),
			}),
			rates: rates(),
			plans: plans(),
			invoice: invoice({ create }),
			create_invoices: true,
			period: PERIOD,
			now: () => NOW,
		});

		expect(create).toHaveBeenCalledTimes(1);
		expect(retry.tenants[0]).toMatchObject({ invoice_id: "inv_retry" });

		const settled = await settleUsagePeriod({
			ledger: ledger({
				insertSettlement: async (settlement: UsageSettlement) => ({
					settlement: { ...settlement, invoice_id: "inv_already" },
					created: false,
				}),
			}),
			rates: rates(),
			plans: plans(),
			invoice: invoice({ create }),
			create_invoices: true,
			period: PERIOD,
			now: () => NOW,
		});

		expect(create).toHaveBeenCalledTimes(1);
		expect(settled.tenants[0]).toMatchObject({ invoice_id: "inv_already" });
	});

	it("defaults to the previous closed month", async () => {
		const result = await settleUsagePeriod({
			ledger: ledger(),
			rates: rates(),
			plans: plans(),
			now: () => NOW,
		});

		expect(result.period).toBe("2026-02");
	});
});
