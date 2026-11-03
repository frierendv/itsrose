import type { SecondaryStorage } from "better-auth";
import {
	API_PLAN_TABLE_NAME,
	BILLING_PLANS,
	DEFAULT_INVOICE_PREFIX,
	INVOICE_EVENT_TABLE_NAME,
	INVOICE_SEQUENCE_TABLE_NAME,
	INVOICE_TABLE_NAME,
	INVOICE_TYPE,
	SUBSCRIPTION_TABLE_NAME,
} from "../domain/constants";
import { formatInvoiceNumber } from "../domain/invoice.service";
import {
	buildSeedPlanData,
	findBuiltInPlan,
	normalizePlan,
} from "../domain/plan.service";
import type {
	BillingRepositories,
	InvoiceEventFilter,
	InvoiceFilter,
	InvoiceRepository,
	InvoiceSequenceRepository,
	PlanRepository,
	SubscriptionRepository,
	UserRepository,
	WebhookEventStore,
} from "../domain/ports";
import { selectCurrentSubscription } from "../domain/subscription.service";
import type {
	ApiPlan,
	InvoiceSequence,
	Subscription,
	TransactionInvoice,
	TransactionInvoiceEvent,
} from "../types";
import {
	deleteCachedValue,
	getCachedValue,
	resolveDatabaseAdapter,
	resolveStorageInstance,
	setCachedValue,
	type BillingPersistenceSource,
	type DatabaseAdapter,
} from "./storage";

const PLAN_LIST_CACHE_KEY = "plans:all";
const PLAN_ITEM_CACHE_PREFIX = "plans:by-id";
const SUBSCRIPTION_CACHE_PREFIX = "subscription:by-id";
const CACHE_TTL_SECONDS = 3600;

function planCacheKey(planId: string): string {
	return `${PLAN_ITEM_CACHE_PREFIX}:${planId}`;
}

function subscriptionCacheKey(userId: string): string {
	return `${SUBSCRIPTION_CACHE_PREFIX}:${userId}`;
}

function createPlanRepository(
	adapter: DatabaseAdapter,
	storage: SecondaryStorage | null
): PlanRepository {
	async function invalidateCache(planId?: string): Promise<void> {
		await deleteCachedValue(storage, PLAN_LIST_CACHE_KEY);
		if (planId) {
			await deleteCachedValue(storage, planCacheKey(planId));
		}
	}

	async function seed(
		plans: readonly (ApiPlan<true> | ApiPlan)[] = BILLING_PLANS
	): Promise<void> {
		for (const plan of plans) {
			const existing = await adapter.findOne<Record<string, unknown>>({
				model: API_PLAN_TABLE_NAME,
				where: [{ field: "plan_id", value: plan.plan_id }],
			});

			if (!existing) {
				await adapter.create({
					model: API_PLAN_TABLE_NAME,
					data: buildSeedPlanData(plan),
				});
			}
		}

		await invalidateCache();
	}

	async function findAll(
		customDefaults?: readonly ApiPlan<true>[]
	): Promise<ApiPlan[]> {
		const cached = await getCachedValue<ApiPlan[]>(
			storage,
			PLAN_LIST_CACHE_KEY
		);
		if (cached.hit && cached.value) {
			return cached.value.map(normalizePlan);
		}

		const rawPlans = await adapter.findMany<Record<string, unknown>>({
			model: API_PLAN_TABLE_NAME,
		});

		let plans = (rawPlans ?? []).map(normalizePlan);

		if (plans.length === 0) {
			const defaults = (customDefaults ?? BILLING_PLANS) as ApiPlan[];
			try {
				await seed(defaults);
			} catch {
				// Migrations may not have run yet; fall back to the catalog.
			}
			plans = defaults.map(normalizePlan);
		}

		await setCachedValue(
			storage,
			PLAN_LIST_CACHE_KEY,
			plans,
			CACHE_TTL_SECONDS
		);

		return plans;
	}

	async function findById(planId: string): Promise<ApiPlan | null> {
		const cached = await getCachedValue<ApiPlan>(
			storage,
			planCacheKey(planId)
		);
		if (cached.hit && cached.value) {
			return normalizePlan(cached.value);
		}

		const raw = await adapter.findOne<Record<string, unknown>>({
			model: API_PLAN_TABLE_NAME,
			where: [{ field: "plan_id", value: planId }],
		});

		const plan = raw ? normalizePlan(raw) : findBuiltInPlan(planId);

		if (plan) {
			await setCachedValue(
				storage,
				planCacheKey(planId),
				plan,
				CACHE_TTL_SECONDS
			);
		}

		return plan;
	}

	async function findStoredById(planId: string): Promise<ApiPlan | null> {
		const raw = await adapter.findOne<Record<string, unknown>>({
			model: API_PLAN_TABLE_NAME,
			where: [{ field: "plan_id", value: planId }],
		});

		return raw ? normalizePlan(raw) : null;
	}

	return {
		findAll,
		findById,
		findStoredById,
		seed,
		async create(data) {
			const created = await adapter.create<Record<string, unknown>>({
				model: API_PLAN_TABLE_NAME,
				data,
			});
			await invalidateCache(data.plan_id as string);
			return normalizePlan(created ?? data);
		},
		async update(planId, data) {
			const updated = await adapter.update<Record<string, unknown>>({
				model: API_PLAN_TABLE_NAME,
				where: [{ field: "plan_id", value: planId }],
				update: data,
			});
			await invalidateCache(planId);
			return updated ? normalizePlan(updated) : null;
		},
		async delete(planId) {
			await adapter.delete({
				model: API_PLAN_TABLE_NAME,
				where: [{ field: "plan_id", value: planId }],
			});
			await invalidateCache(planId);
			return true;
		},
		invalidateCache,
	};
}

function subscriptionTtl(subscription: Subscription | null): number {
	if (!subscription?.period_end) {
		return 60;
	}

	const ttlSeconds = Math.floor(
		(new Date(subscription.period_end).getTime() - Date.now()) / 1000
	);

	return ttlSeconds > 0 ? ttlSeconds : 60;
}

function createSubscriptionRepository(
	adapter: DatabaseAdapter,
	storage: SecondaryStorage | null
): SubscriptionRepository {
	async function invalidateCache(userId: string): Promise<void> {
		await deleteCachedValue(storage, subscriptionCacheKey(userId));
	}

	return {
		async findById(id) {
			return adapter.findOne<Subscription>({
				model: SUBSCRIPTION_TABLE_NAME,
				where: [{ field: "id", value: id }],
			});
		},
		async findCurrentByUser(userId) {
			const cached = await getCachedValue<Subscription>(
				storage,
				subscriptionCacheKey(userId)
			);
			if (cached.hit) {
				return cached.value;
			}

			const subscriptions = await adapter.findMany<Subscription>({
				model: SUBSCRIPTION_TABLE_NAME,
				where: [{ field: "user_id", value: userId }],
			});

			const current = selectCurrentSubscription(subscriptions ?? []);

			await setCachedValue(
				storage,
				subscriptionCacheKey(userId),
				current,
				subscriptionTtl(current)
			);

			return current;
		},
		async findManyByUser(userId) {
			const subscriptions = await adapter.findMany<Subscription>({
				model: SUBSCRIPTION_TABLE_NAME,
				where: [{ field: "user_id", value: userId }],
			});
			return subscriptions ?? [];
		},
		async findAll() {
			const subscriptions = await adapter.findMany<Subscription>({
				model: SUBSCRIPTION_TABLE_NAME,
			});
			return subscriptions ?? [];
		},
		async findManyByStatus(status) {
			const subscriptions = await adapter.findMany<Subscription>({
				model: SUBSCRIPTION_TABLE_NAME,
				where: [{ field: "status", value: status }],
			});
			return subscriptions ?? [];
		},
		async create(data) {
			return adapter.create<Subscription>({
				model: SUBSCRIPTION_TABLE_NAME,
				data: data as unknown as Subscription,
			});
		},
		async update(id, data) {
			const existing = await adapter.findOne<Subscription>({
				model: SUBSCRIPTION_TABLE_NAME,
				where: [{ field: "id", value: id }],
			});

			if (!existing) {
				return null;
			}

			const updated = await adapter.update<Subscription>({
				model: SUBSCRIPTION_TABLE_NAME,
				where: [{ field: "id", value: id }],
				update: data,
			});

			await invalidateCache(existing.user_id);
			return updated ?? { ...existing, ...data };
		},
		invalidateCache,
	};
}

function createInvoiceRepository(adapter: DatabaseAdapter): InvoiceRepository {
	return {
		async findById(invoiceId) {
			return adapter.findOne<TransactionInvoice>({
				model: INVOICE_TABLE_NAME,
				where: [{ field: "invoice_id", value: invoiceId }],
			});
		},
		async findByOrderId(orderId) {
			return adapter.findOne<TransactionInvoice>({
				model: INVOICE_TABLE_NAME,
				where: [{ field: "order_id", value: orderId }],
			});
		},
		async findMany(filter: InvoiceFilter = {}) {
			const where: Array<{ field: string; value: string }> = [];

			if (filter.userId) {
				where.push({ field: "user_id", value: filter.userId });
			}
			if (filter.status) {
				where.push({ field: "status", value: filter.status });
			}
			if (filter.invoiceType) {
				where.push({
					field: "invoice_type",
					value: filter.invoiceType,
				});
			}

			const invoices = await adapter.findMany<TransactionInvoice>({
				model: INVOICE_TABLE_NAME,
				where,
				limit: filter.limit,
				offset: filter.offset,
			});

			return (invoices ?? []).sort((a, b) => {
				const dateA = new Date(a.invoice_date || 0).getTime();
				const dateB = new Date(b.invoice_date || 0).getTime();
				return dateB - dateA;
			});
		},
		async findPendingRenewal(userId) {
			const invoices = await adapter.findMany<TransactionInvoice>({
				model: INVOICE_TABLE_NAME,
				where: [
					{ field: "user_id", value: userId },
					{ field: "invoice_type", value: INVOICE_TYPE.RENEWAL },
					{ field: "status", value: "pending" },
				],
			});
			return invoices ?? [];
		},
		async findPendingByUser(userId) {
			const invoices = await adapter.findMany<TransactionInvoice>({
				model: INVOICE_TABLE_NAME,
				where: [
					{ field: "user_id", value: userId },
					{ field: "status", value: "pending" },
				],
			});
			return invoices ?? [];
		},
		async create(data) {
			const stored = await adapter.create<TransactionInvoice>({
				model: INVOICE_TABLE_NAME,
				data,
			});
			return stored ?? data;
		},
		async update(invoiceId, data) {
			return adapter.update<TransactionInvoice>({
				model: INVOICE_TABLE_NAME,
				where: [{ field: "invoice_id", value: invoiceId }],
				update: data,
			});
		},
	};
}

function createInvoiceEventRepository(
	adapter: DatabaseAdapter
): WebhookEventStore {
	return {
		async record(eventName, eventJson, createdAt) {
			await adapter.create({
				model: INVOICE_EVENT_TABLE_NAME,
				data: {
					event_name: eventName,
					created_at: createdAt ?? new Date(),
					event_json: eventJson,
				},
			});
		},
		async findMany(filter: InvoiceEventFilter = {}) {
			const where: Array<{ field: string; value: string }> = [];

			if (filter.eventName) {
				where.push({ field: "event_name", value: filter.eventName });
			}

			const events = await adapter.findMany<TransactionInvoiceEvent>({
				model: INVOICE_EVENT_TABLE_NAME,
				where,
				limit: filter.limit,
				offset: filter.offset,
				sortBy: { field: "created_at", direction: "desc" },
			});

			return (events ?? []).sort((a, b) => {
				const dateA = new Date(a.created_at || 0).getTime();
				const dateB = new Date(b.created_at || 0).getTime();
				return dateB - dateA;
			});
		},
	};
}

function createInvoiceSequenceRepository(
	adapter: DatabaseAdapter
): InvoiceSequenceRepository {
	return {
		async next(prefix = DEFAULT_INVOICE_PREFIX) {
			const currentYear = new Date().getUTCFullYear();
			const maxRetries = 3;
			let nextVal = 1;

			for (let attempt = 0; attempt < maxRetries; attempt++) {
				try {
					const existing = await adapter.findOne<InvoiceSequence>({
						model: INVOICE_SEQUENCE_TABLE_NAME,
						where: [{ field: "year", value: currentYear }],
					});

					if (!existing) {
						const created = await adapter.create<InvoiceSequence>({
							model: INVOICE_SEQUENCE_TABLE_NAME,
							data: {
								year: currentYear,
								last_val: 1,
							} as InvoiceSequence,
						});
						nextVal = created?.last_val ?? 1;
					} else {
						nextVal = (existing.last_val ?? 0) + 1;
						await adapter.update({
							model: INVOICE_SEQUENCE_TABLE_NAME,
							where: [{ field: "year", value: currentYear }],
							update: { last_val: nextVal },
						});
					}
					break;
				} catch {
					if (attempt === maxRetries - 1) {
						// Last-resort fallback: time-based salt avoids collisions.
						nextVal = Date.now() % 100_000_000;
					}
				}
			}

			return formatInvoiceNumber(currentYear, nextVal, prefix);
		},
	};
}

function createUserRepository(adapter: DatabaseAdapter): UserRepository {
	return {
		async findContact(userId) {
			return adapter.findOne<{
				id: string;
				name?: string | null;
				email?: string | null;
			}>({
				model: "user",
				where: [{ field: "id", value: userId }],
			});
		},
	};
}

/**
 * Builds the repository set bound to a Better Auth endpoint context or a bare
 * `auth.$context` object.
 */
export function createBillingRepositories(
	source:
		BillingPersistenceSource | Parameters<typeof resolveDatabaseAdapter>[0]
): BillingRepositories {
	const adapter = resolveDatabaseAdapter(source);
	const storage = resolveStorageInstance(source);

	return {
		plans: createPlanRepository(adapter, storage),
		subscriptions: createSubscriptionRepository(adapter, storage),
		invoices: createInvoiceRepository(adapter),
		events: createInvoiceEventRepository(adapter),
		sequences: createInvoiceSequenceRepository(adapter),
		users: createUserRepository(adapter),
	};
}
