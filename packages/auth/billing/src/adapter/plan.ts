import type { GenericEndpointContext } from "better-auth";
import {
	buildCreatePlanData,
	buildPlanUpdateData,
	type PlanWriteInput,
} from "../domain/plan.service";
import type { ApiPlan } from "../types";
import { createBillingRepositories } from "./repository";

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
	ctx: GenericEndpointContext,
	plansToSeed?: readonly (ApiPlan<true> | ApiPlan)[]
): Promise<void> {
	return createBillingRepositories(ctx).plans.seed(plansToSeed);
}

/**
 * Retrieves all billing plans, with read-through cache and auto-seed fallback.
 */
export async function getAllPlans(
	ctx: GenericEndpointContext,
	customDefaults?: ApiPlan<true>[]
): Promise<ApiPlan[]> {
	return createBillingRepositories(ctx).plans.findAll(customDefaults);
}

/**
 * Resolves a plan by id, falling back to the built-in catalog.
 */
export async function getPlanById(
	ctx: GenericEndpointContext,
	planId: string
): Promise<ApiPlan | null> {
	return createBillingRepositories(ctx).plans.findById(planId);
}

export async function createPlanRecord(
	ctx: GenericEndpointContext,
	input: PlanWriteInput
): Promise<PlanWriteResult> {
	const repositories = createBillingRepositories(ctx);

	const existing = await repositories.plans.findStoredById(input.plan_id);
	if (existing) {
		return { status: "conflict" };
	}

	const plan = await repositories.plans.create(buildCreatePlanData(input));
	return { status: "created", plan };
}

export async function updatePlanRecord(
	ctx: GenericEndpointContext,
	input: PlanWriteInput
): Promise<PlanWriteResult> {
	const repositories = createBillingRepositories(ctx);

	const existing = await repositories.plans.findStoredById(input.plan_id);
	if (!existing) {
		return { status: "not_found" };
	}

	const updated = await repositories.plans.update(
		input.plan_id,
		buildPlanUpdateData(input)
	);

	return { status: "updated", plan: updated ?? existing };
}

export async function deletePlanRecord(
	ctx: GenericEndpointContext,
	planId: string
): Promise<PlanWriteResult> {
	const repositories = createBillingRepositories(ctx);

	const existing = await repositories.plans.findStoredById(planId);
	if (!existing) {
		return { status: "not_found" };
	}

	await repositories.plans.delete(planId);
	return { status: "deleted", plan: existing };
}
