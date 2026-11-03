import {
	APIError,
	createAuthEndpoint,
	sessionMiddleware,
} from "better-auth/api";
import {
	cancelSubscription,
	getSubscriptionById,
	getUserSubscription,
} from "../../../application";
import { isOwnerOrAdmin } from "../../../domain/permissions";
import { systemClock } from "../../../domain/ports";
import { cancelSubscriptionSchema } from "../../../schema";
import type { BillingPluginOptions } from "../../../types";
import { createBillingServices } from "../../bindings";
import { createRoute } from "../../route";

export const cancelSubscriptionEndpoint = (opts?: BillingPluginOptions) => {
	return createAuthEndpoint(
		createRoute("/subscription/cancel"),
		{
			method: "POST",
			use: [sessionMiddleware],
			body: cancelSubscriptionSchema,
		},
		async (ctx) => {
			const { user } = ctx.context.session;
			const { repositories, options } = createBillingServices(ctx, opts);

			const targetSubscription = ctx.body.subscription_id
				? await getSubscriptionById(
						repositories.subscriptions,
						ctx.body.subscription_id
					)
				: await getUserSubscription(
						repositories.subscriptions,
						user.id
					);

			if (!targetSubscription) {
				throw new APIError("NOT_FOUND", {
					message: "No subscription found to cancel.",
				});
			}

			if (!isOwnerOrAdmin(user, targetSubscription.user_id)) {
				throw new APIError("FORBIDDEN", {
					message:
						"You do not have permission to cancel this subscription.",
				});
			}

			const canceled = await cancelSubscription(
				repositories.subscriptions,
				{
					userId: targetSubscription.user_id,
					subscriptionId: targetSubscription.id,
					cancelAtPeriodEnd: ctx.body.cancel_at_period_end,
				},
				systemClock
			);

			if (canceled) {
				await options.hooks?.onSubscriptionCanceled?.(canceled);
			}

			return ctx.json(canceled);
		}
	);
};
