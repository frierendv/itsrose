import { createAuthEndpoint, sessionMiddleware } from "better-auth/api";
import { z } from "zod/v4";
import {
	USAGE_DAILY_BUCKETS,
	USAGE_MAX_WINDOW_DAYS,
	USAGE_QUOTA_HEADERS,
	USAGE_UNLIMITED_HEADER_VALUE,
	USAGE_WINDOW_DAYS,
} from "../../constants";
import { evaluateQuota, quotaSnapshot } from "../../domain/units";
import { nextPeriodStartDate, periodString } from "../../keys";
import { createRoute } from "../../route";
import type { ResolvedUsageOptions } from "../options";

const windowSchema = z.coerce.number().int().min(1).max(USAGE_MAX_WINDOW_DAYS);

/**
 * Read-side endpoints for the tenant that owns the current session.
 *
 * All payloads stay `snake_case`. They are served under the existing `/auth`
 * mount (`/auth/usage/*`) because Better Auth dispatches every plugin endpoint
 * through the `/auth/*` catch-all route.
 */
export function usageReadEndpoints(options: ResolvedUsageOptions) {
	return {
		getStats: createAuthEndpoint(
			createRoute("/stats"),
			{
				method: "GET",
				use: [sessionMiddleware],
			},
			async (ctx) => {
				const user = ctx.context.session.user;
				const tenant = await options.tenant.forUser(user.id);
				const stats = await options.counter.getStats(
					tenant.tenant_id,
					user.id
				);
				return ctx.json(stats);
			}
		),

		getSummary: createAuthEndpoint(
			createRoute("/summary"),
			{
				method: "GET",
				use: [sessionMiddleware],
				query: z.object({
					days: windowSchema.optional().default(USAGE_WINDOW_DAYS),
				}),
			},
			async (ctx) => {
				const user = ctx.context.session.user;
				const tenant = await options.tenant.forUser(user.id);
				const summary = await options.counter.getSummary(
					tenant.tenant_id,
					ctx.query.days
				);
				return ctx.json(summary);
			}
		),

		getTimeseries: createAuthEndpoint(
			createRoute("/timeseries"),
			{
				method: "GET",
				use: [sessionMiddleware],
				query: z.object({
					days: windowSchema.optional().default(USAGE_WINDOW_DAYS),
				}),
			},
			async (ctx) => {
				const user = ctx.context.session.user;
				const tenant = await options.tenant.forUser(user.id);
				const points = await options.counter.getTimeseries(
					tenant.tenant_id,
					ctx.query.days
				);
				return ctx.json({ points });
			}
		),

		getBreakdown: createAuthEndpoint(
			createRoute("/breakdown"),
			{
				method: "GET",
				use: [sessionMiddleware],
				query: z.object({
					by: z
						.enum(["endpoint", "api_key"])
						.optional()
						.default("endpoint"),
					days: windowSchema.optional().default(USAGE_DAILY_BUCKETS),
				}),
			},
			async (ctx) => {
				const user = ctx.context.session.user;
				const tenant = await options.tenant.forUser(user.id);
				const slices = await options.counter.getBreakdown(
					tenant.tenant_id,
					ctx.query.by,
					ctx.query.days
				);
				return ctx.json({ by: ctx.query.by, slices });
			}
		),

		getQuota: createAuthEndpoint(
			createRoute("/quota"),
			{
				method: "GET",
				use: [sessionMiddleware],
			},
			async (ctx) => {
				const user = ctx.context.session.user;
				const tenant = await options.tenant.forUser(user.id);
				const now = options.clock.now();
				const period = periodString(now);
				const used = await options.counter.getQuotaUsed(
					tenant.tenant_id,
					period
				);
				const info = options.plans
					? await options.plans.forTenant(tenant.tenant_id)
					: null;
				const evaluation = evaluateQuota({
					used,
					limit: info?.quota_requests ?? null,
					mode: options.quota_mode,
				});
				const snapshot = quotaSnapshot(
					tenant.tenant_id,
					period,
					nextPeriodStartDate(now),
					evaluation
				);

				void ctx.setHeader(
					USAGE_QUOTA_HEADERS.limit,
					snapshot.limit === null
						? USAGE_UNLIMITED_HEADER_VALUE
						: String(snapshot.limit)
				);
				void ctx.setHeader(
					USAGE_QUOTA_HEADERS.remaining,
					snapshot.remaining === null
						? USAGE_UNLIMITED_HEADER_VALUE
						: String(snapshot.remaining)
				);
				void ctx.setHeader(
					USAGE_QUOTA_HEADERS.reset,
					snapshot.reset_at
				);
				void ctx.setHeader(USAGE_QUOTA_HEADERS.mode, snapshot.mode);

				return ctx.json(snapshot);
			}
		),
	};
}
