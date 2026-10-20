import {
	APIError,
	createAuthEndpoint,
	sessionMiddleware,
} from "better-auth/api";
import { z } from "zod/v4";
import { createOrUpdateSubscription, getPlanById } from "../../adapter";
import {
	calculateSubscriptionPeriod,
	createRoute,
	isOwnerOrAdmin,
} from "../../server";
import type {
	BillingInterval,
	ItsRosePluginOptions,
	SubscriptionStatus,
} from "../../types";

export const createSubscriptionSchema = z.object({
	userId: z.string().optional(),
	plan_id: z.string(),
	interval: z.enum(["month", "year"]).optional().default("month"),
	period_start: z.iso.datetime().optional(),
	period_end: z.iso.datetime().optional(),
	status: z
		.enum(["active", "trialing", "past_due", "canceled", "expired"])
		.optional()
		.default("active"),
});

export const createSubscriptionEndpoint = (opts?: ItsRosePluginOptions) => {
	return createAuthEndpoint(
		createRoute("/subscription/create"),
		{
			method: "POST",
			use: [sessionMiddleware],
			body: createSubscriptionSchema,
		},
		async (ctx) => {
			const targetUserId = ctx.body.userId || ctx.context.session.user.id;

			if (
				ctx.body.userId &&
				!isOwnerOrAdmin(ctx.context.session.user, ctx.body.userId)
			) {
				throw new APIError("FORBIDDEN", {
					message:
						"Only administrators can assign subscriptions to other users.",
				});
			}

			const plan = await getPlanById(ctx, ctx.body.plan_id);
			if (!plan) {
				throw new APIError("NOT_FOUND", {
					message: `Plan '${ctx.body.plan_id}' does not exist.`,
				});
			}

			const periodStart = ctx.body.period_start
				? new Date(ctx.body.period_start)
				: new Date();
			const periodEnd = ctx.body.period_end
				? new Date(ctx.body.period_end)
				: calculateSubscriptionPeriod(
						periodStart,
						ctx.body.interval as BillingInterval
					).periodEnd;

			const subscription = await createOrUpdateSubscription(ctx, {
				user_id: targetUserId,
				plan_id: plan.plan_id,
				interval: ctx.body.interval as BillingInterval,
				status: ctx.body.status as SubscriptionStatus,
				period_start: periodStart,
				period_end: periodEnd,
				cancel_at_period_end: false,
			});

			await opts?.onSubscriptionCreated?.(subscription, ctx);

			return ctx.json(subscription);
		}
	);
};
