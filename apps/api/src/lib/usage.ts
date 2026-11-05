import {
	createBillingRepositories,
	createMidtransPaymentGateway,
	createUsageInvoice,
	ensureAllPersonalTenants,
	systemClock,
	type BillingRepositories,
	type BillingUnitOfWork,
	type UserSubscription,
} from "@itsrose/auth-billing/server";
import {
	createPostgresUsageLedger,
	createPostgresUsageRateStore,
	createRedisUsageCounter,
	createRedisUsageDayReader,
	normalizeQuotaMode,
	tenantIdForUser,
	type TenantSyncPort,
	type UsageCounterPort,
	type UsageDayReaderPort,
	type UsageInvoiceInput,
	type UsageInvoicePort,
	type UsageLedgerPort,
	type UsagePlanPort,
	type UsageQuotaMode,
	type UsageRateStorePort,
	type UsageTenantInfo,
} from "@itsrose/auth-usage/server";
import type { MidtransClient } from "@itsrose/midtrans";
import type { FastifyInstance } from "fastify";

/**
 * Usage runtime wiring for `apps/api`.
 *
 * Adapters are created lazily and are stateless (they only hold the Redis
 * client or the Postgres pool), so building them in more than one plugin is
 * free.
 */
export function createUsageCounter(fastify: FastifyInstance): UsageCounterPort {
	return createRedisUsageCounter(
		fastify.redis as unknown as Parameters<
			typeof createRedisUsageCounter
		>[0]
	);
}

export function createUsageDayReader(
	fastify: FastifyInstance
): UsageDayReaderPort {
	return createRedisUsageDayReader(
		fastify.redis as unknown as Parameters<
			typeof createRedisUsageDayReader
		>[0]
	);
}

export function createUsageLedger(fastify: FastifyInstance): UsageLedgerPort {
	return createPostgresUsageLedger(
		fastify.database as unknown as Parameters<
			typeof createPostgresUsageLedger
		>[0]
	);
}

export function createUsageRateStore(
	fastify: FastifyInstance
): UsageRateStorePort {
	return createPostgresUsageRateStore(
		fastify.database as unknown as Parameters<
			typeof createPostgresUsageRateStore
		>[0]
	);
}

/**
 * Entitlement resolution: tenant -> owning user -> cached subscription plan.
 *
 * Reuses the subscription value the request path already caches in Redis, so
 * settlement does not add per-request database reads.
 */
export function createUsagePlanPort(fastify: FastifyInstance): UsagePlanPort {
	return {
		async forTenant(tenantId: string): Promise<UsageTenantInfo | null> {
			const ctx = await fastify.auth.$context;
			const repositories = createBillingRepositories(ctx);
			const tenant = await repositories.tenants.findById(tenantId);

			if (!tenant) {
				return null;
			}

			let subscription: UserSubscription;
			try {
				subscription = await fastify.subscription.get(
					tenant.owner_user_id
				);
			} catch {
				return {
					tenant_id: tenantId,
					user_id: tenant.owner_user_id,
					plan_tier: "free",
					quota_requests: null,
				};
			}

			return {
				tenant_id: tenantId,
				user_id: tenant.owner_user_id,
				plan_tier: subscription.plan.plan_id,
				quota_requests: subscription.plan.quota_requests ?? null,
			};
		},
	};
}

/**
 * Backfills personal tenant rows for users that predate the feature.
 */
export function createUsageTenantSync(
	fastify: FastifyInstance
): TenantSyncPort {
	return {
		async ensureAll() {
			const ctx = await fastify.auth.$context;
			const repositories = createBillingRepositories(ctx);
			return ensureAllPersonalTenants(
				repositories,
				tenantIdForUser,
				10_000
			);
		},
	};
}

function noopUnitOfWork(repositories: BillingRepositories): BillingUnitOfWork {
	return {
		repositories,
		run: (work) => work(repositories),
	};
}

/**
 * Creates the provider invoice for a settled period through the billing
 * application service, which owns the Midtrans adapter and invoice numbering.
 */
export function createUsageInvoicePort(
	fastify: FastifyInstance
): UsageInvoicePort {
	return {
		async create(input: UsageInvoiceInput) {
			const ctx = await fastify.auth.$context;
			const repositories = createBillingRepositories(ctx);
			const client = (ctx as { midtrans?: MidtransClient }).midtrans;

			if (!client) {
				throw new Error(
					"Billing Midtrans client is not available on the auth context."
				);
			}

			const user = (await repositories.users.findContact(
				input.user_id
			)) ?? {
				id: input.user_id,
				name: null,
				email: null,
			};

			const result = await createUsageInvoice(
				{
					repositories,
					gateway: createMidtransPaymentGateway(client),
					clock: systemClock,
					unitOfWork: noopUnitOfWork(repositories),
				},
				{
					userId: input.user_id,
					user,
					tenantId: input.tenant_id,
					period: input.period,
					unit: input.unit,
					lines: input.lines.map((line) => ({
						item_id: line.item_id,
						description: line.description,
						price: line.price,
						quantity: line.quantity,
					})),
					grossAmount: input.amount,
					idempotencyKey: input.idempotency_key,
					notes: input.notes,
				}
			);

			if (result.status === "gateway_error") {
				throw new Error(
					`Usage invoice gateway error: ${result.message}`
				);
			}

			return {
				invoice_id: result.invoice.id ?? result.invoice.invoice_id,
			};
		},
	};
}

/**
 * Quota enforcement mode, read from `USAGE_QUOTA_ENFORCEMENT`.
 */
export function usageQuotaMode(fastify: FastifyInstance): UsageQuotaMode {
	const raw = fastify.env.USAGE_QUOTA_ENFORCEMENT;
	return normalizeQuotaMode(typeof raw === "string" ? raw : undefined);
}
