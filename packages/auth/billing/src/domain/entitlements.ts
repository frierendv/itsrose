import type { PlanEntitlements } from "../types";

/**
 * The entitlements a plan carries when it has not declared any.
 *
 * Both keys are `null` (unlimited), so a legacy row — or a plan created
 * before the column existed — is never silently capped.
 */
export const DEFAULT_PLAN_ENTITLEMENTS: PlanEntitlements = Object.freeze({
	storage_bytes: null,
	storage_assets: null,
});

/**
 * Accepts the one value a limit may take: a non-negative integer.
 *
 * Everything else — a negative number, a fraction, a numeric string, a
 * boolean, a missing key — falls back to `null` (unlimited) for that key.
 * The reader never throws and never truncates or rounds a value.
 */
function toLimit(value: unknown): number | null {
	return typeof value === "number" &&
		Number.isSafeInteger(value) &&
		value >= 0
		? value
		: null;
}

/**
 * Reads a JSON object from either its stored string form or an object.
 *
 * The stored column is a string, but rows also reach this reader as objects
 * (seeds, adapter output, the mock database). Invalid JSON, `null`, arrays
 * and primitives yield `null` and therefore the defaults.
 */
function toRecord(value: unknown): Record<string, unknown> | null {
	let candidate = value;

	if (typeof candidate === "string") {
		try {
			candidate = JSON.parse(candidate) as unknown;
		} catch {
			return null;
		}
	}

	if (
		typeof candidate !== "object" ||
		candidate === null ||
		Array.isArray(candidate)
	) {
		return null;
	}

	return candidate as Record<string, unknown>;
}

/**
 * Resolves the typed entitlements of a plan from its stored representation.
 *
 * Tolerant by design: a missing column, invalid JSON, or an invalid
 * per-key value resolves to the defaults instead of throwing, so reading a
 * legacy row can never fail a billing request. Valid keys are kept even when
 * a sibling key is invalid.
 */
export function resolvePlanEntitlements(value: unknown): PlanEntitlements {
	const record = toRecord(value);

	if (!record) {
		return { ...DEFAULT_PLAN_ENTITLEMENTS };
	}

	return {
		storage_bytes: toLimit(record.storage_bytes),
		storage_assets: toLimit(record.storage_assets),
	};
}
