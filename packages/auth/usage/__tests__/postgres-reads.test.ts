import {
	createPostgresUsageLedger,
	createPostgresUsageRateStore,
	type SqlExecutor,
} from "../src/adapter/postgres";

type Row = Record<string, unknown>;

function createSql(responses: Row[][] = []) {
	const calls: Array<{ text: string; values: readonly unknown[] }> = [];
	let index = 0;
	const sql: SqlExecutor = {
		async query(text, values = []) {
			calls.push({ text, values });
			const rows = responses[index] ?? responses.at(-1) ?? [];
			index += 1;
			return { rows, rowCount: rows.length };
		},
	};
	return { sql, calls };
}

const rollupRow: Row = {
	tenant_id: "tenant-1",
	day: "2026-11-05",
	endpoint: "/status",
	api_key_id: "",
	unit: "request",
	requests_total: "4",
	requests_ok: "3",
	latency_ms_sum: 120,
	units_micro: 4_000_000,
	weights_version: 1,
	source: "flush",
	updated_at: new Date("2026-11-05T10:00:00.000Z"),
};

const settlementRow: Row = {
	id: "settlement-1",
	tenant_id: "tenant-1",
	period: "2026-11",
	unit: "request",
	requests: 4,
	units_micro: 4_000_000,
	rates_version: 1,
	unit_rate_id: "rate-1",
	amount: 600,
	invoice_id: null,
	checksum: "abc",
	computed_at: new Date("2026-11-05T10:00:00.000Z"),
};

const rateRow: Row = {
	id: "rate-1",
	unit: "request",
	plan_tier: "free",
	amount: 150,
	rates_version: 1,
	effective_from: new Date("2026-11-01T00:00:00.000Z"),
	effective_to: null,
	created_at: new Date("2026-11-01T00:00:00.000Z"),
	created_by: null,
};

const weightRow: Row = {
	endpoint: "/status",
	unit: "request",
	weight_micro: 500_000,
	weights_version: 2,
	effective_from: new Date("2026-11-01T00:00:00.000Z"),
	effective_to: new Date("2026-12-01T00:00:00.000Z"),
};

describe("ledger reads", () => {
	it("reads a period with UTC day bounds", async () => {
		const { sql, calls } = createSql([[rollupRow]]);
		const ledger = createPostgresUsageLedger(sql);

		const rows = await ledger.readPeriod("tenant-1", "2026-11");

		expect(rows).toHaveLength(1);
		expect(rows[0]?.requests_total).toBe(4);
		expect(rows[0]?.units_micro).toBe(4_000_000);
		expect(calls[0]?.values).toEqual([
			"tenant-1",
			"2026-11-01",
			"2026-12-01",
		]);
	});

	it("maps tenant period aggregates", async () => {
		const { sql } = createSql([
			[
				{
					tenant_id: "tenant-1",
					requests_total: "10",
					requests_ok: 8,
					units_micro: 10_000_000n,
					fallback_requests_ok: "2",
					fallback_units_micro: 2_000_000,
					latency_ms_sum: null,
				},
			],
		]);
		const ledger = createPostgresUsageLedger(sql);

		const rows = await ledger.listTenantsWithUsage("2026-11");

		expect(rows).toEqual([
			{
				tenant_id: "tenant-1",
				requests_total: 10,
				requests_ok: 8,
				units_micro: 10_000_000,
				fallback_requests_ok: 2,
				fallback_units_micro: 2_000_000,
				latency_ms_sum: 0,
			},
		]);
	});

	it("inserts a settlement once and returns the existing one on conflict", async () => {
		const created = createSql([[settlementRow]]);
		const ledgerA = createPostgresUsageLedger(created.sql);
		const first = await ledgerA.insertSettlement({
			tenant_id: "tenant-1",
			period: "2026-11",
			unit: "request",
			requests: 4,
			units_micro: 4_000_000,
			rates_version: 1,
			unit_rate_id: "rate-1",
			amount: 600,
			invoice_id: null,
			checksum: "abc",
		});
		expect(first.created).toBe(true);
		expect(first.settlement.id).toBe("settlement-1");

		const conflicted = createSql([[], [settlementRow]]);
		const ledgerB = createPostgresUsageLedger(conflicted.sql);
		const second = await ledgerB.insertSettlement({
			tenant_id: "tenant-1",
			period: "2026-11",
			unit: "request",
			requests: 4,
			units_micro: 4_000_000,
			rates_version: 1,
			unit_rate_id: "rate-1",
			amount: 600,
			invoice_id: null,
			checksum: "abc",
		});
		expect(second.created).toBe(false);
		expect(second.settlement.amount).toBe(600);
		expect(conflicted.calls).toHaveLength(2);
	});

	it("lists settlements with filters and clamps the limit", async () => {
		const { sql, calls } = createSql([[settlementRow]]);
		const ledger = createPostgresUsageLedger(sql);

		const rows = await ledger.listSettlements({
			tenant_id: "tenant-1",
			period: "2026-11",
			limit: 1_000,
		});

		expect(rows).toHaveLength(1);
		expect(calls[0]?.text).toContain(
			"WHERE tenant_id = $1 AND period = $2"
		);
		expect(calls[0]?.values).toEqual(["tenant-1", "2026-11", 500]);
	});

	it("stamps the invoice id on a settlement", async () => {
		const { sql, calls } = createSql();
		const ledger = createPostgresUsageLedger(sql);

		await ledger.updateSettlementInvoice(
			"tenant-1",
			"2026-11",
			"request",
			"invoice-1"
		);

		expect(calls[0]?.text).toContain("SET invoice_id = $4");
		expect(calls[0]?.values).toEqual([
			"tenant-1",
			"2026-11",
			"request",
			"invoice-1",
		]);
	});
});

describe("rate reads", () => {
	it("resolves the effective rate at an instant", async () => {
		const found = createSql([[rateRow]]);
		const rate = await createPostgresUsageRateStore(found.sql).resolveAt(
			"free",
			"request",
			new Date("2026-11-01T00:00:00.000Z")
		);
		expect(rate).toMatchObject({
			id: "rate-1",
			plan_tier: "free",
			amount: 150,
			effective_to: null,
		});

		const missing = createSql([[]]);
		await expect(
			createPostgresUsageRateStore(missing.sql).resolveAt(
				"free",
				"request",
				new Date()
			)
		).resolves.toBeNull();
	});

	it("lists open rates and effective weights", async () => {
		const rates = createSql([[rateRow]]);
		const open = await createPostgresUsageRateStore(rates.sql).listOpen();
		expect(open[0]?.rates_version).toBe(1);

		const weights = createSql([[weightRow]]);
		const effective = await createPostgresUsageRateStore(
			weights.sql
		).listWeights(new Date("2026-11-05T00:00:00.000Z"));
		expect(effective[0]).toMatchObject({
			endpoint: "/status",
			weight_micro: 500_000,
			effective_to: "2026-12-01T00:00:00.000Z",
		});
	});
});
