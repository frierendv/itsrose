import {
	buildCreatePlanData,
	buildPlanUpdateData,
	type PlanWriteInput,
} from "../domain/plan.service";
import type { PlanRepository } from "../domain/ports";
import type { ApiPlan } from "../types";

export type PlanWriteResult =
	| { status: "created"; plan: ApiPlan }
	| { status: "updated"; plan: ApiPlan }
	| { status: "deleted"; plan: ApiPlan }
	| { status: "conflict" }
	| { status: "not_found" };

/**
 * Seeds default billing plans into the database if not already present.
 */
export async function seedDefaultPlans(
	repositories: Pick<PlanRepository, "seed">,
	plansToSeed?: readonly (ApiPlan<true> | ApiPlan)[]
): Promise<void> {
	return repositories.seed(plansToSeed);
}

/**
 * Retrieves all billing plans, with read-through cache and auto-seed fallback.
 */
export async function getAllPlans(
	repositories: Pick<PlanRepository, "findAll">,
	customDefaults?: ApiPlan<true>[]
): Promise<ApiPlan[]> {
	return repositories.findAll(customDefaults);
}

/**
 * Resolves a plan by id, falling back to the built-in catalog.
 */
export async function getPlanById(
	repositories: Pick<PlanRepository, "findById">,
	planId: string
): Promise<ApiPlan | null> {
	return repositories.findById(planId);
}

export async function createPlanRecord(
	repositories: Pick<PlanRepository, "findStoredById" | "create">,
	input: PlanWriteInput
): Promise<PlanWriteResult> {
	const existing = await repositories.findStoredById(input.plan_id);
	if (existing) {
		return { status: "conflict" };
	}

	const plan = await repositories.create(buildCreatePlanData(input));
	return { status: "created", plan };
}

export async function updatePlanRecord(
	repositories: Pick<PlanRepository, "findStoredById" | "update">,
	input: PlanWriteInput
): Promise<PlanWriteResult> {
	const existing = await repositories.findStoredById(input.plan_id);
	if (!existing) {
		return { status: "not_found" };
	}

	const updated = await repositories.update(
		input.plan_id,
		buildPlanUpdateData(input)
	);

	return { status: "updated", plan: updated ?? existing };
}

export async function deletePlanRecord(
	repositories: Pick<PlanRepository, "findStoredById" | "delete">,
	planId: string
): Promise<PlanWriteResult> {
	const existing = await repositories.findStoredById(planId);
	if (!existing) {
		return { status: "not_found" };
	}

	await repositories.delete(planId);
	return { status: "deleted", plan: existing };
}
