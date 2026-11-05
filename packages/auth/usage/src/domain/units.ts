import {
	USAGE_DEFAULT_ENDPOINT,
	USAGE_QUOTA_MODE_HARD,
	USAGE_QUOTA_MODE_SOFT,
	USAGE_UNIT_MICRO_SCALE,
} from "../constants";
import type {
	UsageBreakdownSlice,
	UsageEndpointWeight,
	UsageQuotaMode,
	UsageQuotaSnapshot,
	UsageStatusClass,
} from "../types";

/* -------------------------------------------------------------------------- */
/*                              Status classes                                */
/* -------------------------------------------------------------------------- */

export function statusClassOf(statusCode: number): UsageStatusClass {
	if (statusCode >= 500) {
		return "5xx";
	}
	if (statusCode >= 400) {
		return "4xx";
	}
	if (statusCode >= 300) {
		return "3xx";
	}
	return "2xx";
}

/**
 * Billable responses: served successfully. Client errors (including quota and
 * rate-limit rejections) and server faults never consume quota.
 */
export function isBillableStatus(statusClass: UsageStatusClass): boolean {
	return statusClass === "2xx" || statusClass === "3xx";
}

/* -------------------------------------------------------------------------- */
/*                                 Weights                                    */
/* -------------------------------------------------------------------------- */

export type ResolvedWeight = { weight_micro: number; weights_version: number };

const DEFAULT_WEIGHT: ResolvedWeight = {
	weight_micro: USAGE_UNIT_MICRO_SCALE,
	weights_version: 1,
};

/**
 * Resolves the weight for an endpoint, falling back to the `*` row and then to
 * one unit per request.
 */
export function resolveWeight(
	endpoint: string,
	weights: readonly UsageEndpointWeight[]
): ResolvedWeight {
	let exact: UsageEndpointWeight | undefined;
	let fallback: UsageEndpointWeight | undefined;

	for (const weight of weights) {
		if (weight.endpoint === endpoint) {
			exact = weight;
		} else if (weight.endpoint === USAGE_DEFAULT_ENDPOINT) {
			fallback = weight;
		}
	}

	const resolved = exact ?? fallback;
	if (!resolved) {
		return DEFAULT_WEIGHT;
	}

	return {
		weight_micro: toInteger(
			resolved.weight_micro,
			DEFAULT_WEIGHT.weight_micro
		),
		weights_version: toInteger(
			resolved.weights_version,
			DEFAULT_WEIGHT.weights_version
		),
	};
}

/**
 * Exact integer micro-units for a weight and a billable request count.
 */
export function unitsMicroFor(requestsOk: number, weightMicro: number): number {
	const requests = Math.max(0, Math.trunc(requestsOk));
	const weight = Math.max(0, Math.trunc(weightMicro));
	return requests * weight;
}

/* -------------------------------------------------------------------------- */
/*                                  Money                                     */
/* -------------------------------------------------------------------------- */

/**
 * Converts micro-units into an IDR amount, rounding half up exactly once per
 * invoice line.
 */
export function amountFor(unitsMicro: number, rateAmount: number): number {
	const units = Math.max(0, Math.trunc(unitsMicro));
	const rate = Math.max(0, Math.trunc(rateAmount));
	if (units === 0 || rate === 0) {
		return 0;
	}

	const numerator = units * rate;
	const denominator = USAGE_UNIT_MICRO_SCALE;
	const quotient = Math.floor(numerator / denominator);
	const remainder = numerator % denominator;
	return remainder * 2 >= denominator ? quotient + 1 : quotient;
}

/* -------------------------------------------------------------------------- */
/*                                  Quota                                     */
/* -------------------------------------------------------------------------- */

export function normalizeQuotaMode(mode?: string | null): UsageQuotaMode {
	return mode === USAGE_QUOTA_MODE_HARD
		? USAGE_QUOTA_MODE_HARD
		: USAGE_QUOTA_MODE_SOFT;
}

export type QuotaEvaluation = {
	mode: UsageQuotaMode;
	used: number;
	limit: number | null;
	remaining: number | null;
	exceeded: boolean;
	/** Only ever true in hard mode; soft mode reports without blocking. */
	blocked: boolean;
};

/**
 * Pure quota decision. `limit === null` means unlimited.
 */
export function evaluateQuota(input: {
	used: number;
	limit: number | null | undefined;
	mode?: string | null;
}): QuotaEvaluation {
	const mode = normalizeQuotaMode(input.mode);
	const used = Math.max(0, Math.trunc(input.used || 0));
	const limit =
		typeof input.limit === "number" && Number.isFinite(input.limit)
			? Math.max(0, Math.trunc(input.limit))
			: null;

	if (limit === null) {
		return {
			mode,
			used,
			limit: null,
			remaining: null,
			exceeded: false,
			blocked: false,
		};
	}

	const exceeded = used >= limit;
	return {
		mode,
		used,
		limit,
		remaining: Math.max(0, limit - used),
		exceeded,
		blocked: exceeded && mode === USAGE_QUOTA_MODE_HARD,
	};
}

export function quotaSnapshot(
	tenantId: string,
	period: string,
	resetAt: Date,
	evaluation: QuotaEvaluation
): UsageQuotaSnapshot {
	return {
		tenant_id: tenantId,
		period,
		used: evaluation.used,
		limit: evaluation.limit,
		remaining: evaluation.remaining,
		reset_at: resetAt.toISOString(),
		mode: evaluation.mode,
		enforced: evaluation.blocked,
	};
}

/* -------------------------------------------------------------------------- */
/*                                 Breakdown                                  */
/* -------------------------------------------------------------------------- */

/**
 * Sorts breakdown slices by volume, keeping deterministic tie-breaking.
 */
export function sortBreakdown(
	slices: readonly UsageBreakdownSlice[]
): UsageBreakdownSlice[] {
	return [...slices].sort((left, right) => {
		if (right.requests_ok !== left.requests_ok) {
			return right.requests_ok - left.requests_ok;
		}
		return left.key.localeCompare(right.key);
	});
}

/* -------------------------------------------------------------------------- */
/*                                 Helpers                                    */
/* -------------------------------------------------------------------------- */

function toInteger(value: unknown, fallback: number): number {
	const numeric =
		typeof value === "number"
			? value
			: typeof value === "bigint"
				? Number(value)
				: Number(value);
	return Number.isFinite(numeric) ? Math.trunc(numeric) : fallback;
}

/**
 * Deterministic 32-bit FNV-1a hash used as a settlement checksum.
 *
 * Domain-safe: no `node:crypto`, so the same value can be recomputed in a test
 * or in SQL-less tooling without a runtime dependency.
 */
export function settlementChecksum(input: {
	tenant_id: string;
	period: string;
	unit: string;
	requests: number;
	units_micro: number;
	rates_version: number | null;
	amount: number;
}): string {
	const payload = [
		input.tenant_id,
		input.period,
		input.unit,
		String(input.requests),
		String(input.units_micro),
		String(input.rates_version ?? ""),
		String(input.amount),
	].join("|");

	let hash = 0x811c9dc5;
	for (let index = 0; index < payload.length; index += 1) {
		hash ^= payload.charCodeAt(index);
		hash = Math.imul(hash, 0x01000193) >>> 0;
	}
	return hash.toString(16).padStart(8, "0");
}
