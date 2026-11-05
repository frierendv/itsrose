import { randomUUID } from "node:crypto";
import {
	USAGE_DAILY_ROLLUPS_TABLE,
	USAGE_DEFAULT_ENDPOINT,
	USAGE_ENDPOINT_WEIGHTS_TABLE,
	USAGE_RATE_AUDIT_TABLE,
	USAGE_SETTLEMENTS_TABLE,
	USAGE_UNIT_MICRO_SCALE,
	USAGE_UNIT_RATES_TABLE,
} from "../constants";
import { periodDayBounds } from "../keys";
import type {
	UsageEndpointWeight,
	UsageLedgerPort,
	UsageRateStorePort,
	UsageRollupRow,
	UsageSettlement,
	UsageTenantPeriod,
	UsageUnitRate,
} from "../types";

/* -------------------------------------------------------------------------- */
/*                          Structural SQL surface                            */
/* -------------------------------------------------------------------------- */

export type SqlQueryResult = {
	rows: Array<Record<string, unknown>>;
	rowCount?: number | null;
};

/**
 * Minimal SQL surface used by the adapters.
 *
 * Declared structurally so the package never imports `pg`; the host
 * application passes its existing pool (`fastify.database`).
 */
export interface SqlExecutor {
	query(text: string, values?: readonly unknown[]): Promise<SqlQueryResult>;
}

/* -------------------------------------------------------------------------- */
/*                                  Helpers                                   */
/* -------------------------------------------------------------------------- */

function toNumber(value: unknown, fallback = 0): number {
	if (typeof value === "number") {
		return Number.isFinite(value) ? value : fallback;
	}
	if (typeof value === "bigint") {
		return Number(value);
	}
	const numeric = Number(value);
	return Number.isFinite(numeric) ? numeric : fallback;
}

function toIso(value: unknown): string | null {
	if (!value) {
		return null;
	}
	if (value instanceof Date) {
		return value.toISOString();
	}
	if (typeof value === "string") {
		return value;
	}
	return null;
}

function mapRate(row: Record<string, unknown>): UsageUnitRate {
	return {
		id: String(row.id ?? ""),
		unit: String(row.unit ?? ""),
		plan_tier: String(row.plan_tier ?? ""),
		amount: toNumber(row.amount),
		currency: "IDR",
		rates_version: toNumber(row.rates_version),
		effective_from: toIso(row.effective_from) ?? new Date(0).toISOString(),
		effective_to: toIso(row.effective_to),
		created_at: toIso(row.created_at) ?? undefined,
		created_by: typeof row.created_by === "string" ? row.created_by : null,
	};
}

function mapWeight(row: Record<string, unknown>): UsageEndpointWeight {
	return {
		endpoint: String(row.endpoint ?? ""),
		unit: String(row.unit ?? ""),
		weight_micro: toNumber(row.weight_micro, USAGE_UNIT_MICRO_SCALE),
		weights_version: toNumber(row.weights_version, 1),
		effective_from: toIso(row.effective_from) ?? new Date(0).toISOString(),
		effective_to: toIso(row.effective_to),
	};
}

function mapSettlement(row: Record<string, unknown>): UsageSettlement {
	return {
		id: typeof row.id === "string" ? row.id : undefined,
		tenant_id: String(row.tenant_id ?? ""),
		period: String(row.period ?? ""),
		unit: String(row.unit ?? ""),
		requests: toNumber(row.requests),
		units_micro: toNumber(row.units_micro),
		rates_version:
			row.rates_version === null || row.rates_version === undefined
				? null
				: toNumber(row.rates_version),
		unit_rate_id:
			typeof row.unit_rate_id === "string" ? row.unit_rate_id : null,
		amount: toNumber(row.amount),
		invoice_id: typeof row.invoice_id === "string" ? row.invoice_id : null,
		checksum: String(row.checksum ?? ""),
		computed_at: toIso(row.computed_at) ?? undefined,
	};
}

function mapRollup(row: Record<string, unknown>): UsageRollupRow {
	return {
		tenant_id: String(row.tenant_id ?? ""),
		day: String(row.day ?? ""),
		endpoint: String(row.endpoint ?? ""),
		api_key_id: String(row.api_key_id ?? ""),
		unit: String(row.unit ?? ""),
		requests_total: toNumber(row.requests_total),
		requests_ok: toNumber(row.requests_ok),
		latency_ms_sum: toNumber(row.latency_ms_sum),
		units_micro: toNumber(row.units_micro),
		weights_version: toNumber(row.weights_version, 1),
		source: String(row.source ?? "flush"),
	};
}

const ROLLUP_COLUMNS = [
	"tenant_id",
	"day",
	"endpoint",
	"api_key_id",
	"unit",
	"requests_total",
	"requests_ok",
	"latency_ms_sum",
	"units_micro",
	"weights_version",
	"source",
] as const;

const SETTLEMENT_COLUMNS = [
	"tenant_id",
	"period",
	"unit",
	"requests",
	"units_micro",
	"rates_version",
	"unit_rate_id",
	"amount",
	"invoice_id",
	"checksum",
] as const;

/* -------------------------------------------------------------------------- */
/*                                  Ledger                                    */
/* -------------------------------------------------------------------------- */

/**
 * Postgres ledger adapter.
 *
 * Rollups are written with a monotonic, idempotent upsert: counters only grow,
 * so a later flush can never lower a row and repeated or concurrent flushes are
 * no-ops. That is what makes the Redis snapshot sync safe without distributed
 * locks, and it reuses exactly the same path as the backfill.
 */
export function createPostgresUsageLedger(sql: SqlExecutor): UsageLedgerPort {
	return {
		async upsertRollups(rows: readonly UsageRollupRow[]): Promise<number> {
			if (rows.length === 0) {
				return 0;
			}

			const values: unknown[] = [];
			const tuples: string[] = [];

			for (const row of rows) {
				const offset = values.length;
				const placeholders = Array.from(
					{ length: ROLLUP_COLUMNS.length + 2 },
					(_, index) => `$${offset + index + 1}`
				);
				tuples.push(`(${placeholders.join(", ")})`);
				values.push(
					randomUUID(),
					row.tenant_id,
					row.day,
					row.endpoint,
					row.api_key_id,
					row.unit,
					row.requests_total,
					row.requests_ok,
					row.latency_ms_sum,
					row.units_micro,
					row.weights_version,
					row.source,
					new Date()
				);
			}

			const result = await sql.query(
				`INSERT INTO ${USAGE_DAILY_ROLLUPS_TABLE}
					(id, ${ROLLUP_COLUMNS.join(", ")}, updated_at)
				 VALUES ${tuples.join(",\n")}
				 ON CONFLICT (tenant_id, day, endpoint, api_key_id, unit)
				 DO UPDATE SET
					requests_total = GREATEST(${USAGE_DAILY_ROLLUPS_TABLE}.requests_total, EXCLUDED.requests_total),
					requests_ok = GREATEST(${USAGE_DAILY_ROLLUPS_TABLE}.requests_ok, EXCLUDED.requests_ok),
					latency_ms_sum = GREATEST(${USAGE_DAILY_ROLLUPS_TABLE}.latency_ms_sum, EXCLUDED.latency_ms_sum),
					units_micro = GREATEST(${USAGE_DAILY_ROLLUPS_TABLE}.units_micro, EXCLUDED.units_micro),
					weights_version = EXCLUDED.weights_version,
					source = EXCLUDED.source,
					updated_at = EXCLUDED.updated_at
				 WHERE EXCLUDED.requests_total >= ${USAGE_DAILY_ROLLUPS_TABLE}.requests_total`,
				values
			);

			return result.rowCount ?? rows.length;
		},

		async readPeriod(
			tenantId: string,
			period: string
		): Promise<UsageRollupRow[]> {
			const bounds = periodDayBounds(period);
			const result = await sql.query(
				`SELECT ${ROLLUP_COLUMNS.join(", ")}
				 FROM ${USAGE_DAILY_ROLLUPS_TABLE}
				 WHERE tenant_id = $1 AND day >= $2 AND day < $3
				 ORDER BY day ASC, endpoint ASC`,
				[tenantId, bounds.start, bounds.end]
			);

			return result.rows.map(mapRollup);
		},

		async listTenantsWithUsage(
			period: string
		): Promise<UsageTenantPeriod[]> {
			const bounds = periodDayBounds(period);
			const result = await sql.query(
				`SELECT tenant_id,
					SUM(CASE WHEN endpoint = '*' AND api_key_id = '' THEN requests_total ELSE 0 END) AS requests_total,
					SUM(CASE WHEN endpoint <> '*' AND api_key_id = '' THEN requests_ok ELSE 0 END) AS requests_ok,
					SUM(CASE WHEN endpoint <> '*' AND api_key_id = '' THEN units_micro ELSE 0 END) AS units_micro,
					SUM(CASE WHEN endpoint = '*' AND api_key_id = '' THEN requests_ok ELSE 0 END) AS fallback_requests_ok,
					SUM(CASE WHEN endpoint = '*' AND api_key_id = '' THEN units_micro ELSE 0 END) AS fallback_units_micro,
					SUM(CASE WHEN endpoint = '*' AND api_key_id = '' THEN latency_ms_sum ELSE 0 END) AS latency_ms_sum
				 FROM ${USAGE_DAILY_ROLLUPS_TABLE}
				 WHERE day >= $1 AND day < $2
				 GROUP BY tenant_id
				 ORDER BY tenant_id ASC`,
				[bounds.start, bounds.end]
			);

			return result.rows.map((row) => ({
				tenant_id: String(row.tenant_id ?? ""),
				requests_total: toNumber(row.requests_total),
				requests_ok: toNumber(row.requests_ok),
				units_micro: toNumber(row.units_micro),
				fallback_requests_ok: toNumber(row.fallback_requests_ok),
				fallback_units_micro: toNumber(row.fallback_units_micro),
				latency_ms_sum: toNumber(row.latency_ms_sum),
			}));
		},

		async insertSettlement(
			settlement: UsageSettlement
		): Promise<{ settlement: UsageSettlement; created: boolean }> {
			const values = [
				randomUUID(),
				settlement.tenant_id,
				settlement.period,
				settlement.unit,
				settlement.requests,
				settlement.units_micro,
				settlement.rates_version,
				settlement.unit_rate_id,
				settlement.amount,
				settlement.invoice_id,
				settlement.checksum,
				new Date(),
			];

			const inserted = await sql.query(
				`INSERT INTO ${USAGE_SETTLEMENTS_TABLE}
					(id, ${SETTLEMENT_COLUMNS.join(", ")}, computed_at)
				 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
				 ON CONFLICT (tenant_id, period, unit) DO NOTHING
				 RETURNING *`,
				values
			);

			const insertedRow = inserted.rows[0];
			if (insertedRow) {
				return {
					settlement: mapSettlement(insertedRow),
					created: true,
				};
			}

			const existing = await sql.query(
				`SELECT * FROM ${USAGE_SETTLEMENTS_TABLE}
				 WHERE tenant_id = $1 AND period = $2 AND unit = $3
				 LIMIT 1`,
				[settlement.tenant_id, settlement.period, settlement.unit]
			);

			return {
				settlement: existing.rows[0]
					? mapSettlement(existing.rows[0])
					: settlement,
				created: false,
			};
		},

		async listSettlements(filter?: {
			tenant_id?: string;
			period?: string;
			limit?: number;
		}): Promise<UsageSettlement[]> {
			const where: string[] = [];
			const values: unknown[] = [];

			if (filter?.tenant_id) {
				values.push(filter.tenant_id);
				where.push(`tenant_id = $${values.length}`);
			}
			if (filter?.period) {
				values.push(filter.period);
				where.push(`period = $${values.length}`);
			}

			const limit = Math.min(Math.max(filter?.limit ?? 100, 1), 500);
			values.push(limit);

			const result = await sql.query(
				`SELECT * FROM ${USAGE_SETTLEMENTS_TABLE}
				 ${where.length > 0 ? `WHERE ${where.join(" AND ")}` : ""}
				 ORDER BY period DESC, tenant_id ASC
				 LIMIT $${values.length}`,
				values
			);

			return result.rows.map(mapSettlement);
		},

		async updateSettlementInvoice(
			tenantId: string,
			period: string,
			unit: string,
			invoiceId: string
		): Promise<void> {
			await sql.query(
				`UPDATE ${USAGE_SETTLEMENTS_TABLE}
				 SET invoice_id = $4
				 WHERE tenant_id = $1 AND period = $2 AND unit = $3`,
				[tenantId, period, unit, invoiceId]
			);
		},
	};
}

/* -------------------------------------------------------------------------- */
/*                                Rate store                                  */
/* -------------------------------------------------------------------------- */

export type PostgresUsageRateStoreOptions = {
	/** Overrides `Date.now`, used by tests. */
	now?: () => Date;
};

/**
 * Append-only unit-rate and endpoint-weight store.
 *
 * Editing a rate never mutates history: the open row is closed and a new
 * version is inserted in the same statement, with an audit row. Settlements
 * resolve the rate effective at the period start and stamp its version, so a
 * later edit can never change an issued invoice.
 */
export function createPostgresUsageRateStore(
	sql: SqlExecutor,
	options: PostgresUsageRateStoreOptions = {}
): UsageRateStorePort {
	const now = options.now ?? (() => new Date());

	return {
		async resolveAt(planTier, unit, at) {
			const result = await sql.query(
				`SELECT * FROM ${USAGE_UNIT_RATES_TABLE}
				 WHERE plan_tier = $1 AND unit = $2
				   AND effective_from <= $3
				   AND (effective_to IS NULL OR effective_to > $3)
				 ORDER BY effective_from DESC
				 LIMIT 1`,
				[planTier, unit, at]
			);

			const row = result.rows[0];
			return row ? mapRate(row) : null;
		},

		async listOpen() {
			const result = await sql.query(
				`SELECT * FROM ${USAGE_UNIT_RATES_TABLE}
				 WHERE effective_to IS NULL
				 ORDER BY plan_tier ASC, unit ASC`
			);
			return result.rows.map(mapRate);
		},

		async setRate(input) {
			const at = input.effective_from ?? now();
			const result = await sql.query(
				`WITH closed AS (
					UPDATE ${USAGE_UNIT_RATES_TABLE}
					SET effective_to = $4
					WHERE plan_tier = $1 AND unit = $2 AND effective_to IS NULL
					RETURNING id, amount
				 ), inserted AS (
					INSERT INTO ${USAGE_UNIT_RATES_TABLE}
						(id, unit, plan_tier, amount, currency, rates_version,
						 effective_from, effective_to, created_at, created_by)
					VALUES ($5, $2, $1, $3, 'IDR', $6, $4, NULL, $7, $8)
					RETURNING *
				 ), audited AS (
					INSERT INTO ${USAGE_RATE_AUDIT_TABLE}
						(id, rate_id, actor_user_id, old_amount, new_amount, changed_at, note)
					SELECT $9, inserted.id, $8, closed.amount, inserted.amount, $7, $10
					FROM inserted LEFT JOIN closed ON TRUE
					RETURNING id
				 )
				 SELECT * FROM inserted`,
				[
					input.plan_tier,
					input.unit,
					input.amount,
					at,
					randomUUID(),
					at.getTime(),
					at,
					input.created_by ?? null,
					randomUUID(),
					"rate version created",
				]
			);

			const row = result.rows[0];
			if (!row) {
				throw new Error(
					`Failed to persist usage rate for ${input.plan_tier}/${input.unit}`
				);
			}
			return mapRate(row);
		},

		async listWeights(at) {
			const result = await sql.query(
				`SELECT * FROM ${USAGE_ENDPOINT_WEIGHTS_TABLE}
				 WHERE effective_from <= $1
				   AND (effective_to IS NULL OR effective_to > $1)
				 ORDER BY endpoint ASC`,
				[at]
			);
			return result.rows.map(mapWeight);
		},

		async ensureDefaults(input) {
			const at = now();
			for (const tier of input.plan_tiers) {
				await sql.query(
					`INSERT INTO ${USAGE_UNIT_RATES_TABLE}
						(id, unit, plan_tier, amount, currency, rates_version,
						 effective_from, effective_to, created_at, created_by)
					 SELECT $1, $2, $3, 0, 'IDR', $4, $5, NULL, $5, NULL
					 WHERE NOT EXISTS (
						SELECT 1 FROM ${USAGE_UNIT_RATES_TABLE}
						WHERE plan_tier = $3 AND unit = $2 AND effective_to IS NULL
					 )`,
					[randomUUID(), input.unit, tier, at.getTime(), at]
				);
			}

			await sql.query(
				`INSERT INTO ${USAGE_ENDPOINT_WEIGHTS_TABLE}
					(id, endpoint, unit, weight_micro, weights_version,
					 effective_from, effective_to, created_at)
				 SELECT $1, $2, $3, $4, $5, $6, NULL, $6
				 WHERE NOT EXISTS (
					SELECT 1 FROM ${USAGE_ENDPOINT_WEIGHTS_TABLE}
					WHERE endpoint = $2 AND unit = $3 AND effective_to IS NULL
				 )`,
				[
					randomUUID(),
					USAGE_DEFAULT_ENDPOINT,
					input.unit,
					USAGE_UNIT_MICRO_SCALE,
					1,
					at,
				]
			);
		},
	};
}
