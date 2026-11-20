import { getSubscription } from "@/lib/auth";
import { CACHE_KEYS } from "@/lib/cache";
import {
	createUsageCounter,
	createUsageDayReader,
	createUsageInvoicePort,
	createUsageLedger,
	createUsagePlanPort,
	createUsageRateStore,
	createUsageTenantSync,
	usageQuotaMode,
} from "@/lib/usage";
import { voiceProvider } from "@/lib/voice-provider";
import { redisStorage } from "@better-auth/redis-storage";
import {
	STANDARD_TIER_RATES,
	type UserSubscription,
} from "@itsrose/auth-billing";
import {
	generationPurgePlugin,
	voicePurgePlugin,
} from "@itsrose/auth-resources/plugin";
import {
	createPostgresGenerationRegistry,
	createPostgresProviderRegistry,
} from "@itsrose/auth-resources/registry";
import { usagePlugin } from "@itsrose/auth-usage/plugin";
import { createBetterAuthServer, type AuthServer } from "@itsrose/auth/server";
import fp from "fastify-plugin";

export default fp(
	async (fastify) => {
		const trustedOrigins = fastify.env.APP_BASE_URL
			? fastify.env.APP_BASE_URL.split(",").map((origin) => origin.trim())
			: [];
		// #if DEV
		if (!trustedOrigins.length || !("localhost" in trustedOrigins)) {
			trustedOrigins.push("http://localhost:3000");
		}
		// #endif

		const allowedHosts = fastify.env.ROOT_DOMAIN
			? [fastify.env.ROOT_DOMAIN, `*.${fastify.env.ROOT_DOMAIN}`]
			: [];
		if (allowedHosts.length > 1) {
			trustedOrigins.push(`https://*.${fastify.env.ROOT_DOMAIN}`);
		}
		const fallbackHost =
			fastify.env.BETTER_AUTH_BASE_URL ?? fastify.env.APP_BASE_URL;

		const auth = createBetterAuthServer({
			baseURL:
				allowedHosts.length > 1
					? { allowedHosts, fallback: fallbackHost }
					: fallbackHost,
			trustedOrigins,
			basePath: "/auth",
			database: fastify.database,
			secondaryStorage: redisStorage({
				client: fastify.redis,
				keyPrefix: "auth:",
			}),
			plugins: [
				usagePlugin({
					counter: createUsageCounter(fastify),
					dayReader: createUsageDayReader(fastify),
					ledger: createUsageLedger(fastify),
					rates: createUsageRateStore(fastify),
					plans: createUsagePlanPort(fastify),
					invoices: createUsageInvoicePort(fastify),
					tenantSync: createUsageTenantSync(fastify),
					quota_mode: usageQuotaMode(fastify),
					plan_tiers: Object.keys(STANDARD_TIER_RATES),
				}),
				// Account deletion removes the user's upstream voice clones.
				// The ledger and the upstream port come from the host, so the
				// auth package never imports the feature client.
				voicePurgePlugin({
					registry: createPostgresProviderRegistry(fastify.database),
					provider: voiceProvider,
					clock: () => new Date(),
				}),
				// Account deletion hard-deletes the user's generation
				// history. The rows are a ledger, not a durable record: the
				// objects were already covered by the storage purge, and the
				// saved copies by the asset purge.
				generationPurgePlugin({
					registry: createPostgresGenerationRegistry(
						fastify.database
					),
					clock: () => new Date(),
				}),
			],
		});

		void fastify.decorate("auth", auth);
		void fastify.decorate("subscription", {
			get: (userId: string) => getSubscription(auth, userId),
			invalidate: async (userId: string) => {
				try {
					await fastify.redis
						.pipeline()
						.del(CACHE_KEYS.subscriptionAccess(userId))
						.del(CACHE_KEYS.badSubscription(userId))
						.exec();
				} catch (err) {
					fastify.log.warn(
						{ err, userId },
						"Failed to invalidate subscription cache"
					);
				}
			},
		});
	},
	{
		name: "auth",
		dependencies: ["env", "database", "redis-storage"],
		decorators: { fastify: ["redis", "database"] },
	}
);

declare module "fastify" {
	interface FastifyInstance {
		auth: AuthServer;
		subscription: {
			get: (userId: string) => Promise<UserSubscription>;
			invalidate: (userId: string) => Promise<void>;
		};
	}
}
