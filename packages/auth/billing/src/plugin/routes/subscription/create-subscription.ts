import {
	APIError,
	createAuthEndpoint,
	sessionMiddleware,
} from "better-auth/api";
import { createOrUpdateSubscription, getPlanById } from "../../../application";
import { isOwnerOrAdmin } from "../../../domain/permissions";
import { calculateSubscriptionPeriod } from "../../../domain/subscription.service";
import { createSubscriptionSchema } from "../../../schema";
import type { BillingPluginOptions } from "../../../types";
import { createBillingServices } from "../../bindings";
import { createRoute } from "../../route";

export const createSubscriptionEndpoint = (opts?: BillingPluginOptions) => {
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

			const { repositories, options } = createBillingServices(ctx, opts);
			const plan = await getPlanById(
				repositories.plans,
				ctx.body.plan_id
			);
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
				: calculateSubscriptionPeriod(periodStart, ctx.body.interval)
						.periodEnd;

			const subscription = await createOrUpdateSubscription(
				repositories.subscriptions,
				{
					user_id: targetUserId,
					plan_id: plan.plan_id,
					interval: ctx.body.interval,
					status: ctx.body.status,
					period_start: periodStart,
					period_end: periodEnd,
					cancel_at_period_end: false,
				}
			);

			await options.hooks?.onSubscriptionCreated?.(subscription);

			return ctx.json(subscription);
		}
	);
};
