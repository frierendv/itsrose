import {
	USAGE_DEFAULT_ENDPOINT,
	USAGE_EMPTY_API_KEY,
	USAGE_SOURCE_FLUSH,
	USAGE_UNIT_REQUEST,
} from "../constants";
import { resolveWeight, unitsMicroFor } from "../domain/units";
import type {
	UsageDayReaderPort,
	UsageDayTenantSnapshot,
	UsageEndpointWeight,
	UsageLedgerPort,
	UsageRollupRow,
} from "../types";

export type FlushUsageInput = {
	dayReader: UsageDayReaderPort;
	ledger: UsageLedgerPort;
	/** Resolved endpoint weights for the flush instant. */
	weights?: readonly UsageEndpointWeight[];
	/** UTC day strings to project. Defaults to today. */
	days?: readonly string[];
	unit?: string;
	source?: string;
};

export type FlushUsageResult = {
	days: string[];
	tenants: number;
	rows: number;
	written: number;
};

/**
 * Projects one tenant-day of hot counters into ledger rows.
 *
 * Three row kinds are emitted, because they answer different questions and
 * must never be summed together:
 *
 * - tenant row `("*", "")`: totals and latency, for analytics.
 * - endpoint rows `(endpoint, "")`: billable requests and weighted units, the
 *   settlement input (weights may differ per endpoint).
 * - key rows `("*", api_key_id)`: billable requests per API key, for the
 *   dashboard breakdown.
 */
export function buildRollupRows(input: {
	snapshot: UsageDayTenantSnapshot;
	unit: string;
	source: string;
	weights: readonly UsageEndpointWeight[];
}): UsageRollupRow[] {
	const { snapshot, unit, source, weights } = input;
	const rows: UsageRollupRow[] = [];
	const tenantWeight = resolveWeight(USAGE_DEFAULT_ENDPOINT, weights);
	const base = {
		tenant_id: snapshot.tenant_id,
		day: "",
		api_key_id: USAGE_EMPTY_API_KEY,
		unit,
		source,
	};

	rows.push({
		...base,
		day: "",
		endpoint: USAGE_DEFAULT_ENDPOINT,
		requests_total: snapshot.requests_total,
		requests_ok: snapshot.requests_ok,
		latency_ms_sum: snapshot.latency_ms_sum,
		units_micro: unitsMicroFor(
			snapshot.requests_ok,
			tenantWeight.weight_micro
		),
		weights_version: tenantWeight.weights_version,
	});

	for (const endpoint of snapshot.endpoints) {
		const weight = resolveWeight(endpoint.endpoint, weights);
		rows.push({
			...base,
			day: "",
			endpoint: endpoint.endpoint,
			requests_total: endpoint.requests_total,
			requests_ok: endpoint.requests_ok,
			latency_ms_sum: 0,
			units_micro: unitsMicroFor(
				endpoint.requests_ok,
				weight.weight_micro
			),
			weights_version: weight.weights_version,
		});
	}

	for (const apiKey of snapshot.api_keys) {
		rows.push({
			...base,
			day: "",
			api_key_id: apiKey.api_key_id,
			endpoint: USAGE_DEFAULT_ENDPOINT,
			requests_total: apiKey.requests_ok,
			requests_ok: apiKey.requests_ok,
			latency_ms_sum: 0,
			units_micro: unitsMicroFor(
				apiKey.requests_ok,
				tenantWeight.weight_micro
			),
			weights_version: tenantWeight.weights_version,
		});
	}

	return rows;
}

/**
 * Flushes (or backfills) Redis day counters into `usage_daily_rollups`.
 *
 * Safe to run repeatedly and concurrently: the ledger upsert is monotonic, so
 * a late or duplicated flush can never lower a row. The same function powers
 * the backfill, which is why there is no separate reconciliation path.
 */
export async function flushUsageRollups(
	input: FlushUsageInput
): Promise<FlushUsageResult> {
	const days =
		input.days && input.days.length > 0
			? [...input.days]
			: [new Date().toISOString().slice(0, 10)];
	const unit = input.unit ?? USAGE_UNIT_REQUEST;
	const source = input.source ?? USAGE_SOURCE_FLUSH;
	const weights = input.weights ?? [];
	const tenants = new Set<string>();

	let rows = 0;
	let written = 0;

	for (const day of days) {
		const tenantIds = await input.dayReader.listTenantIds(day);
		const dayRows: UsageRollupRow[] = [];

		for (const tenantId of tenantIds) {
			tenants.add(tenantId);
			const snapshot = await input.dayReader.readTenantDay(tenantId, day);
			dayRows.push(
				...buildRollupRows({ snapshot, unit, source, weights }).map(
					(row) => ({ ...row, day })
				)
			);
		}

		rows += dayRows.length;
		if (dayRows.length > 0) {
			written += await input.ledger.upsertRollups(dayRows);
		}
	}

	return { days, tenants: tenants.size, rows, written };
}
