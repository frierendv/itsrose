import {
	APIError,
	createAuthEndpoint,
	sessionMiddleware,
} from "better-auth/api";
import { updateSubscriptionRecord } from "../../../adapter";
import { isAdmin } from "../../../domain/permissions";
import { updateSubscriptionSchema } from "../../../schema";
import type { BillingPluginOptions } from "../../../types";
import { createRoute } from "../../route";

export const updateSubscriptionEndpoint = (_opts?: BillingPluginOptions) => {
	return createAuthEndpoint(
		createRoute("/subscription/update"),
		{
			method: "POST",
			use: [sessionMiddleware],
			body: updateSubscriptionSchema,
		},
		async (ctx) => {
			if (!isAdmin(ctx.context.session.user)) {
				throw new APIError("FORBIDDEN", {
					message: "Admin role required to update subscriptions.",
				});
			}

			const updated = await updateSubscriptionRecord(ctx, {
				subscriptionId: ctx.body.subscription_id,
				userId: ctx.body.userId,
				plan_id: ctx.body.plan_id,
				interval: ctx.body.interval,
				status: ctx.body.status,
				period_start: ctx.body.period_start,
				period_end: ctx.body.period_end,
				scheduled_tier: ctx.body.scheduled_tier,
				cancel_at_period_end: ctx.body.cancel_at_period_end,
			});

			if (!updated) {
				throw new APIError("NOT_FOUND", {
					message: "Subscription record not found.",
				});
			}

			return ctx.json(updated);
		}
	);
};
