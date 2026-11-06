import {
	createPostgresUsageLedger,
	createPostgresUsageRateStore,
	type SqlExecutor,
} from "../src/adapter/postgres";

type Recorded = { text: string; values: readonly unknown[] };

function createSqlStub(row: Record<string, unknown> = {}): {
	sql: SqlExecutor;
	calls: Recorded[];
} {
	const calls: Recorded[] = [];
	const sql: SqlExecutor = {
		async query(text, values = []) {
			calls.push({ text, values });
			return { rows: [row], rowCount: 1 };
		},
	};
	return { sql, calls };
}

/**
 * Every referenced placeholder must have a parameter and every parameter must
 * be referenced; Postgres rejects an unused parameter it cannot type.
 */
function assertPlaceholdersMatch(text: string, values: readonly unknown[]) {
	const referenced = new Set(
		[...text.matchAll(/\$(\d+)/g)].map((match) => Number(match[1]))
	);
	const max = Math.max(0, ...referenced);
	expect(max).toBe(values.length);
	for (let index = 1; index <= max; index += 1) {
		expect(referenced.has(index)).toBe(true);
	}
}

describe("ledger SQL parameters", () => {
	it("upsertRollups binds every placeholder", async () => {
		const { sql, calls } = createSqlStub();
		const ledger = createPostgresUsageLedger(sql);

		await ledger.upsertRollups([
			{
				tenant_id: "t1",
				day: "2026-11-05",
				endpoint: "/status",
				api_key_id: "",
				unit: "request",
				requests_total: 1,
				requests_ok: 1,
				latency_ms_sum: 5,
				units_micro: 1_000_000,
				weights_version: 1,
				source: "flush",
			},
		]);

		const insert = calls[0];
		expect(insert).toBeTruthy();
		assertPlaceholdersMatch(insert!.text, insert!.values);
	});

	it("setRate binds every placeholder", async () => {
		const { sql, calls } = createSqlStub({
			id: "rate-1",
			unit: "request",
			plan_tier: "free",
			amount: 150,
			currency: "IDR",
			rates_version: 1,
			effective_from: "2026-11-01T00:00:00.000Z",
			effective_to: null,
			created_at: "2026-11-01T00:00:00.000Z",
			created_by: "user-1",
		});
		const rates = createPostgresUsageRateStore(sql);

		const rate = await rates.setRate({
			plan_tier: "free",
			unit: "request",
			amount: 150,
			effective_from: new Date("2026-11-01T00:00:00.000Z"),
			created_by: "user-1",
		});

		expect(rate.amount).toBe(150);
		const call = calls[0];
		expect(call).toBeTruthy();
		assertPlaceholdersMatch(call!.text, call!.values);
	});

	it("ensureDefaults binds every placeholder", async () => {
		const { sql, calls } = createSqlStub();
		const rates = createPostgresUsageRateStore(sql);

		await rates.ensureDefaults({ plan_tiers: ["free"], unit: "request" });

		expect(calls.length).toBe(2);
		for (const call of calls) {
			assertPlaceholdersMatch(call.text, call.values);
		}
	});
});
