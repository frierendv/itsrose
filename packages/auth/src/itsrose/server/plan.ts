import type { ApiPlan, PlanPrice } from "../types";
import { RATE_LIMIT } from "./constants";

/**
 * Normalizes an API plan from database or seed to conform strictly to `ApiPlan`.
 */
export function normalizePlan(plan: Record<string, unknown>): ApiPlan {
	const planId = (plan.plan_id ?? "free") as string;
	const features = (
		Array.isArray(plan.features) ? plan.features : []
	) as string[];

	const limits =
		(plan.limits as ApiPlan["limits"]) ??
		RATE_LIMIT[planId as keyof typeof RATE_LIMIT] ??
		RATE_LIMIT.free;

	const highlighted =
		typeof plan.highlighted === "boolean"
			? plan.highlighted
			: plan.highlighted === "true";

	return {
		id: (plan.id as string) ?? planId,
		plan_id: planId,
		name: (plan.name as string) ?? `${planId.toUpperCase()} Plan`,
		description: (plan.description as string | null) ?? null,
		price: plan.price as PlanPrice,
		features,
		limits,
		highlighted,
	};
}
