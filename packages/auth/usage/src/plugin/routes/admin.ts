import {
	APIError,
	createAuthEndpoint,
	sessionMiddleware,
} from "better-auth/api";
import { z } from "zod/v4";
import { flushUsageRollups } from "../../application/flush";
import { settleUsagePeriod } from "../../application/settlement";
import { USAGE_MAX_WINDOW_DAYS } from "../../constants";
import { isUsageAdmin } from "../../domain/permissions";
import { utcDayDate, utcDayString } from "../../keys";
import { createRoute } from "../../route";
import type { ResolvedUsageOptions } from "../options";

const daySchema = z
	.string()
	.regex(/^\d{4}-\d{2}-\d{2}$/, "Expected a YYYY-MM-DD UTC day");

const periodSchema = z
	.string()
	.regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Expected a YYYY-MM period");

function requireAdmin(options: ResolvedUsageOptions, user: unknown): void {
	void options;
	if (!isUsageAdmin(user as { id: string; role?: string | null })) {
		throw new APIError("FORBIDDEN", {
			message: "Admin role required to manage usage metering.",
		});
	}
}

function missingPort(port: string): never {
	throw new APIError("INTERNAL_SERVER_ERROR", {
		message: `Usage ${port} is not configured on this deployment.`,
	});
}

/**
 * Administrative endpoints: rate management, ledger flush/backfill, period
 * settlement and tenant backfill.
 *
 * Authorization reuses the single Better Auth `admin` role; no second RBAC.
 */
export function usageAdminEndpoints(options: ResolvedUsageOptions) {
	return {
		listUsageRates: createAuthEndpoint(
			createRoute("/admin/rates"),
			{
				method: "GET",
				use: [sessionMiddleware],
			},
			async (ctx) => {
				requireAdmin(options, ctx.context.session.user);
				if (!options.rates) {
					missingPort("rate store");
				}
				// Keep the seeded defaults available even when the schema was
				// migrated after boot; the insert is idempotent.
				if (options.plan_tiers && options.plan_tiers.length > 0) {
					try {
						await options.rates.ensureDefaults({
							plan_tiers: options.plan_tiers,
							unit: options.unit,
						});
					} catch {
						// The ledger tables may not be migrated yet.
					}
				}
				const rates = await options.rates.listOpen();
				return ctx.json({ rates });
			}
		),

		setUsageRate: createAuthEndpoint(
			createRoute("/admin/rates/set"),
			{
				method: "POST",
				use: [sessionMiddleware],
				body: z.object({
					plan_tier: z.string().min(1),
					amount: z.number().int().min(0),
					unit: z.string().min(1).optional(),
					effective_from: z.iso.datetime().optional(),
					note: z.string().max(500).optional(),
				}),
			},
			async (ctx) => {
				const user = ctx.context.session.user;
				requireAdmin(options, user);
				if (!options.rates) {
					missingPort("rate store");
				}

				const rate = await options.rates.setRate({
					plan_tier: ctx.body.plan_tier,
					unit: ctx.body.unit ?? options.unit,
					amount: ctx.body.amount,
					effective_from: ctx.body.effective_from
						? new Date(ctx.body.effective_from)
						: options.clock.now(),
					created_by: user.id,
				});

				return ctx.json({ rate });
			}
		),

		flushUsage: createAuthEndpoint(
			createRoute("/admin/flush"),
			{
				method: "POST",
				use: [sessionMiddleware],
				body: z.object({
					days: z
						.number()
						.int()
						.min(1)
						.max(USAGE_MAX_WINDOW_DAYS)
						.optional(),
					from: daySchema.optional(),
					to: daySchema.optional(),
				}),
			},
			async (ctx) => {
				requireAdmin(options, ctx.context.session.user);
				if (!options.dayReader || !options.ledger) {
					missingPort("day reader or ledger");
				}

				const days = resolveFlushDays(ctx.body ?? {});
				const weights = options.rates
					? await options.rates.listWeights(options.clock.now())
					: [];

				const result = await flushUsageRollups({
					dayReader: options.dayReader,
					ledger: options.ledger,
					weights,
					days,
					unit: options.unit,
				});

				return ctx.json({ ...result, source: "flush" });
			}
		),

		settleUsage: createAuthEndpoint(
			createRoute("/admin/settle"),
			{
				method: "POST",
				use: [sessionMiddleware],
				body: z.object({
					period: periodSchema.optional(),
					create_invoices: z.boolean().optional().default(false),
				}),
			},
			async (ctx) => {
				requireAdmin(options, ctx.context.session.user);
				if (!options.ledger || !options.rates || !options.plans) {
					missingPort("ledger, rate store or plan resolution");
				}

				const result = await settleUsagePeriod({
					ledger: options.ledger,
					rates: options.rates,
					plans: options.plans,
					invoice: options.invoices,
					period: ctx.body?.period,
					unit: options.unit,
					create_invoices: ctx.body?.create_invoices ?? false,
					now: options.clock.now,
				});

				return ctx.json(result);
			}
		),

		listUsageSettlements: createAuthEndpoint(
			createRoute("/admin/settlements"),
			{
				method: "GET",
				use: [sessionMiddleware],
				query: z.object({
					tenant_id: z.string().optional(),
					period: periodSchema.optional(),
					limit: z.coerce
						.number()
						.int()
						.min(1)
						.max(500)
						.optional()
						.default(100),
				}),
			},
			async (ctx) => {
				requireAdmin(options, ctx.context.session.user);
				if (!options.ledger) {
					missingPort("ledger");
				}

				const settlements = await options.ledger.listSettlements({
					tenant_id: ctx.query.tenant_id,
					period: ctx.query.period,
					limit: ctx.query.limit,
				});
				return ctx.json({ settlements });
			}
		),

		syncUsageTenants: createAuthEndpoint(
			createRoute("/admin/tenants/sync"),
			{
				method: "POST",
				use: [sessionMiddleware],
			},
			async (ctx) => {
				requireAdmin(options, ctx.context.session.user);
				if (!options.tenantSync) {
					missingPort("tenant sync");
				}

				const result = await options.tenantSync.ensureAll();
				return ctx.json(result);
			}
		),
	};
}

function resolveFlushDays(body: {
	days?: number;
	from?: string;
	to?: string;
}): string[] {
	if (body.from || body.to) {
		const from = body.from ?? body.to ?? utcDayString();
		const to = body.to ?? body.from ?? utcDayString();
		const fromDate = new Date(`${from}T00:00:00.000Z`).getTime();
		const toDate = new Date(`${to}T00:00:00.000Z`).getTime();

		if (!Number.isFinite(fromDate) || !Number.isFinite(toDate)) {
			throw new APIError("BAD_REQUEST", {
				message: "Invalid flush day range.",
			});
		}

		const start = Math.min(fromDate, toDate);
		const end = Math.max(fromDate, toDate);
		const days: string[] = [];
		for (
			let cursor = start;
			cursor <= end && days.length < USAGE_MAX_WINDOW_DAYS;
			cursor += 86_400_000
		) {
			days.push(utcDayString(new Date(cursor)));
		}
		return days;
	}

	const count = body.days ?? 3;
	return Array.from({ length: count }, (_, index) =>
		utcDayString(utcDayDate(count - 1 - index))
	);
}
