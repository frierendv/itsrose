import type { GenericEndpointContext, SecondaryStorage } from "better-auth";
import {
	API_PLAN_TABLE_NAME,
	BILLING_PLANS,
	deserialize,
	normalizePlan,
	serialize,
} from "../server";
import type { ApiPlan } from "../types";
import { getDbAdapterInstance, getStorageInstance } from "./storage";

const CACHE_TTL = 3600; // 1 hour
const CACHE_KEY = "plans:by-id" as const; // only by id

function getStorageKeyAll() {
	return `${CACHE_KEY}:*`;
}
function getStorageKeyById(planId: string) {
	return `${CACHE_KEY}:${planId}`;
}

async function setPlansInStorage(
	plans: ApiPlan[],
	storage: SecondaryStorage
): Promise<void> {
	for await (const plan of plans) {
		const serialized = serialize(plan);
		await storage.set(
			getStorageKeyById(plan.plan_id),
			serialized,
			CACHE_TTL
		);
	}
}
async function setPlanInStorage(plan: ApiPlan, storage: SecondaryStorage) {
	const key = getStorageKeyById(plan.plan_id);
	const serialized = serialize(plan);
	await storage.set(key, serialized, CACHE_TTL);
}

async function getPlansFromStorage(
	ctx: GenericEndpointContext,
	storage: SecondaryStorage
): Promise<ApiPlan[] | null> {
	const key = getStorageKeyAll();
	const data = await storage.get(key);
	return deserialize<ApiPlan[]>(data);
}
async function getPlanByIdFromStorage(
	ctx: GenericEndpointContext,
	planId: string,
	storage: SecondaryStorage
): Promise<ApiPlan | null> {
	const key = getStorageKeyById(planId);
	const data = await storage.get(key);
	return deserialize<ApiPlan>(data);
}

/**
 * Resolves a plan by tier, preferring in-memory BILLING_PLANS to skip the DB
 * round-trip for well-known tiers.
 */
function getPlanByIdInMemory(planId: string): ApiPlan | null {
	const found = BILLING_PLANS.find((p) => p.plan_id === planId);
	return found ? normalizePlan(found) : null;
}

/**
 * Seeds default billing plans into the database if not already present.
 */
export async function seedDefaultPlans(
	ctx: GenericEndpointContext,
	plansToSeed: readonly (ApiPlan<true> | ApiPlan)[] = BILLING_PLANS
): Promise<void> {
	const adapter = getDbAdapterInstance(ctx);

	for (const plan of plansToSeed) {
		const planId = plan.plan_id;
		const existing = await adapter.findOne<ApiPlan>({
			model: API_PLAN_TABLE_NAME,
			where: [{ field: "plan_id", value: planId }],
		});

		if (!existing) {
			await adapter.create({
				model: API_PLAN_TABLE_NAME,
				data: {
					plan_id: planId,
					name: plan.name,
					description: plan.description ?? "",
					price: plan.price ?? {},
					features: plan.features ?? [],
					highlighted: String(Boolean(plan.highlighted)),
				},
			});
		}
	}
}

/**
 * Retrieves all billing plans from the database, with auto-seed fallback.
 */
export async function getAllPlans(
	ctx: GenericEndpointContext,
	customDefaults?: ApiPlan<true>[]
) {
	const storage = getStorageInstance(ctx);

	if (storage) {
		const plansFromStorage = await getPlansFromStorage(ctx, storage);
		if (plansFromStorage) {
			return plansFromStorage.map(normalizePlan);
		}
	}

	// fallback to database
	const adapter = getDbAdapterInstance(ctx);

	const rawPlans = await adapter.findMany<Record<string, unknown>>({
		model: API_PLAN_TABLE_NAME,
	});

	let plans: ApiPlan[] | undefined;
	if (!rawPlans || rawPlans.length === 0) {
		plans = (customDefaults ?? BILLING_PLANS) as ApiPlan[];

		try {
			await seedDefaultPlans(ctx, plans);
		} catch {
			// no-op
		}
	}

	if (!plans) {
		plans = BILLING_PLANS;
	}
	if (storage) {
		await setPlansInStorage(plans, storage);
	}

	return plans.map(normalizePlan);
}

export async function getPlanById(ctx: GenericEndpointContext, planId: string) {
	const storage = getStorageInstance(ctx);
	if (storage) {
		const fromStorage = await getPlanByIdFromStorage(ctx, planId, storage);
		if (fromStorage) {
			return normalizePlan(fromStorage);
		}
	}

	// fallback to database
	const adapter = getDbAdapterInstance(ctx);

	// Check by plan_id
	const raw = await adapter.findOne<ApiPlan>({
		model: API_PLAN_TABLE_NAME,
		where: [{ field: "plan_id", value: planId }],
	});

	let plan: ApiPlan | undefined | null;
	if (raw) {
		plan = raw;
	}

	// fallback from harcoded plan
	if (!plan) {
		plan = getPlanByIdInMemory(planId);
	}

	if (plan && storage) {
		await setPlanInStorage(plan, storage);
	}

	return plan;
}
