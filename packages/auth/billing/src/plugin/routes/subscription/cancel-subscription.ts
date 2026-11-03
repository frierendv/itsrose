import {
	APIError,
	createAuthEndpoint,
	sessionMiddleware,
} from "better-auth/api";
import {
	cancelSubscription,
	getSubscriptionById,
	getUserSubscription,
} from "../../../adapter";
import { isOwnerOrAdmin } from "../../../domain/permissions";
import { cancelSubscriptionSchema } from "../../../schema";
import type { BillingPluginOptions } from "../../../types";
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

			const targetSubscription = ctx.body.subscription_id
				? await getSubscriptionById(ctx, ctx.body.subscription_id)
				: await getUserSubscription(ctx, user.id);

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

			const canceled = await cancelSubscription(ctx, {
				userId: targetSubscription.user_id,
				subscriptionId: targetSubscription.id,
				cancelAtPeriodEnd: ctx.body.cancel_at_period_end,
			});

			if (canceled) {
				await opts?.onSubscriptionCanceled?.(canceled, ctx);
			}

			return ctx.json(canceled);
		}
	);
};
