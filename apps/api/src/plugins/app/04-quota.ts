import { deny } from "@/lib/auth";
import { createUsageCounter, usageQuotaMode } from "@/lib/usage";
import {
	evaluateQuota,
	nextPeriodStartDate,
	periodString,
	tenantIdForUser,
	USAGE_QUOTA_HEADERS,
	USAGE_UNLIMITED_HEADER_VALUE,
	type UsageQuotaMode,
} from "@itsrose/auth-usage/server";
import fp from "fastify-plugin";

export type RequestQuotaState = {
	used: number;
	limit: number | null;
	remaining: number | null;
	reset_at: string;
	mode: UsageQuotaMode;
	enforced: boolean;
};

/**
 * Period quota headers and (optionally) hard enforcement.
 *
 * Distinct from `@fastify/rate-limit`: rate limiting caps requests per minute,
 * quota caps billable requests per billing period. The plan allowance comes
 * from the subscription already resolved and cached by `auth-guard`, so the
 * only added cost is one Redis read of the monthly counter.
 */
export default fp(
	async (fastify) => {
		const counter = createUsageCounter(fastify);
		const mode = usageQuotaMode(fastify);

		void fastify.decorateRequest("quota", null);

		void fastify.addHook("preValidation", async (request, reply) => {
			const userId = request.userId;
			if (!userId) {
				return;
			}

			const limit = request.subscription?.plan?.quota_requests ?? null;
			const tenantId = tenantIdForUser(userId);
			const period = periodString();
			const resetAt = nextPeriodStartDate().toISOString();

			let used = 0;
			try {
				used = await counter.getQuotaUsed(tenantId, period);
			} catch (err) {
				fastify.log.warn(
					{ err, userId },
					"Failed to read quota counter; treating as zero"
				);
			}

			const evaluation = evaluateQuota({ used, limit, mode });
			request.quota = {
				used: evaluation.used,
				limit: evaluation.limit,
				remaining: evaluation.remaining,
				reset_at: resetAt,
				mode: evaluation.mode,
				enforced: evaluation.blocked,
			};

			if (evaluation.blocked) {
				return deny(reply, {
					code: "QUOTA_EXCEEDED",
					message: `Monthly request quota exhausted (${evaluation.used}/${evaluation.limit}). It resets at ${resetAt}.`,
					errors: {
						quota: "Upgrade the plan or wait for the next billing period.",
					},
					meta: {
						period,
						limit: evaluation.limit,
						used: evaluation.used,
						remaining: 0,
						reset_at: resetAt,
					},
				});
			}
		});

		void fastify.addHook("onSend", async (request, reply, payload) => {
			const quota = request.quota;
			if (quota) {
				void reply.header(
					USAGE_QUOTA_HEADERS.limit,
					quota.limit === null
						? USAGE_UNLIMITED_HEADER_VALUE
						: String(quota.limit)
				);
				void reply.header(
					USAGE_QUOTA_HEADERS.remaining,
					quota.remaining === null
						? USAGE_UNLIMITED_HEADER_VALUE
						: String(quota.remaining)
				);
				void reply.header(USAGE_QUOTA_HEADERS.reset, quota.reset_at);
				void reply.header(USAGE_QUOTA_HEADERS.mode, quota.mode);
				void reply.header(
					USAGE_QUOTA_HEADERS.enforced,
					quota.enforced ? "true" : "false"
				);
			}
			return payload;
		});
	},
	{ name: "quota", dependencies: ["auth-guard", "redis-storage"] }
);

declare module "fastify" {
	interface FastifyRequest {
		quota: RequestQuotaState | null;
	}
}
