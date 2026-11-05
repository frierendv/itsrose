import type { ApiPlan, BillingInterval, PlanLimits, PlanPrice } from "../types";
import {
	BILLING_PLANS,
	FREE_PLAN,
	RATE_LIMIT,
	STANDARD_TIER_QUOTA,
} from "./constants";

const DEFAULT_PLAN_PRICE: PlanPrice = {
	amount: 0,
	currency: "IDR",
	interval: "month",
};

export type PlanPriceInput = {
	id?: string;
	amount: number;
	currency?: "IDR";
	interval?: BillingInterval;
};

export type PlanWriteInput = {
	plan_id: string;
	name?: string;
	description?: string;
	/** Legacy catalog payload used by the dashboard admin form. */
	prices?: PlanPriceInput[];
	price?: PlanPriceInput;
	features?: string[];
	quota_requests?: number | null;
	highlighted?: boolean;
};

function toBillingInterval(value: unknown): BillingInterval {
	return value === "year" ? "year" : "month";
}

/**
 * Normalizes any plan-like record (seed, DB row, legacy `prices[]` payload)
 * into the canonical {@link ApiPlan} shape.
 */
export function normalizePlan(plan: Record<string, unknown>): ApiPlan {
	const planId = (plan.plan_id ?? "free") as string;
	const features = (
		Array.isArray(plan.features) ? plan.features : []
	) as string[];

	const limits =
		(plan.limits as PlanLimits | undefined) ??
		RATE_LIMIT[planId as keyof typeof RATE_LIMIT] ??
		RATE_LIMIT.free;

	const highlighted =
		typeof plan.highlighted === "boolean"
			? plan.highlighted
			: plan.highlighted === "true";

	const rawPrice = (plan.price ?? plan.prices) as
		PlanPrice | PlanPriceInput[] | undefined;

	return {
		id: (plan.id as string) ?? planId,
		plan_id: planId,
		name: (plan.name as string) ?? `${planId.toUpperCase()} Plan`,
		description: (plan.description as string | null) ?? null,
		price: normalizePrice(rawPrice),
		features,
		limits,
		quota_requests: normalizeQuota(plan.quota_requests, planId),
		highlighted,
	};
}

/**
 * Normalizes the monthly request allowance. `null` is a real value (unlimited),
 * so it is preserved; missing values fall back to the seeded tier defaults.
 */
function normalizeQuota(raw: unknown, planId: string): number | null {
	if (raw === null) {
		return null;
	}
	if (typeof raw === "number" && Number.isFinite(raw)) {
		return Math.max(0, Math.trunc(raw));
	}
	if (typeof raw === "string" && raw.trim().length > 0) {
		const numeric = Number(raw);
		if (Number.isFinite(numeric)) {
			return Math.max(0, Math.trunc(numeric));
		}
	}
	return STANDARD_TIER_QUOTA[planId.toLowerCase()] ?? null;
}

function normalizePrice(
	raw: PlanPrice | PlanPriceInput[] | PlanPriceInput | undefined
): PlanPrice {
	if (!raw) {
		return { ...DEFAULT_PLAN_PRICE };
	}

	if (Array.isArray(raw)) {
		return normalizePrice(raw[0]);
	}

	return {
		amount: Number(raw.amount) || 0,
		currency: "IDR",
		interval: toBillingInterval(raw.interval),
	};
}

/**
 * Resolves a plan from the built-in catalog without a database round-trip.
 */
export function findBuiltInPlan(planId: string): ApiPlan | null {
	const normalizedId = planId.toLowerCase();
	const found = BILLING_PLANS.find(
		(plan) => plan.plan_id.toLowerCase() === normalizedId
	);
	return found
		? normalizePlan(found as unknown as Record<string, unknown>)
		: null;
}

export function resolvePlanOrFree(plan: ApiPlan | null | undefined): ApiPlan {
	return (
		plan ?? normalizePlan(FREE_PLAN as unknown as Record<string, unknown>)
	);
}

export function getRateLimitForPlan(planId: string): PlanLimits {
	return (
		RATE_LIMIT[planId.toLowerCase() as keyof typeof RATE_LIMIT] ??
		RATE_LIMIT.free
	);
}

/**
 * Builds the row inserted by the admin "create plan" endpoint.
 * Accepts the legacy `prices[]` payload and stores the canonical `price`.
 */
export function buildCreatePlanData(
	input: PlanWriteInput
): Record<string, unknown> {
	return {
		plan_id: input.plan_id,
		name: input.name ?? input.plan_id,
		description: input.description ?? "",
		price: normalizePrice(input.price ?? input.prices),
		features: input.features ?? [],
		quota_requests: input.quota_requests ?? null,
		highlighted: String(Boolean(input.highlighted)),
	};
}

/**
 * Builds a partial row for the admin "update plan" endpoint.
 */
export function buildPlanUpdateData(
	input: PlanWriteInput
): Record<string, unknown> {
	const update: Record<string, unknown> = {};

	if (input.name !== undefined) {
		update.name = input.name;
	}
	if (input.description !== undefined) {
		update.description = input.description;
	}
	if (input.price !== undefined || input.prices !== undefined) {
		update.price = normalizePrice(input.price ?? input.prices);
	}
	if (input.features !== undefined) {
		update.features = input.features;
	}
	if (input.quota_requests !== undefined) {
		update.quota_requests = input.quota_requests;
	}
	if (input.highlighted !== undefined) {
		update.highlighted = String(input.highlighted);
	}

	return update;
}

/**
 * Builds the row inserted when seeding the default catalog.
 */
export function buildSeedPlanData(
	plan: ApiPlan<true> | ApiPlan
): Record<string, unknown> {
	return {
		plan_id: plan.plan_id,
		name: plan.name,
		description: plan.description ?? "",
		price: normalizePrice(plan.price),
		features: plan.features ?? [],
		quota_requests: plan.quota_requests,
		highlighted: String(Boolean(plan.highlighted)),
	};
}
