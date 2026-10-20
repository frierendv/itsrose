import {
	APIError,
	createAuthEndpoint,
	sessionMiddleware,
} from "better-auth/api";
import { z } from "zod/v4";
import { cancelSubscription, getUserSubscription } from "../../adapter";
import { createRoute, isOwnerOrAdmin } from "../../server";
import type { ItsRosePluginOptions } from "../../types";

export const cancelSubscriptionSchema = z.object({
	subscription_id: z.string().optional(),
	cancel_at_period_end: z.boolean().optional().default(true),
});

export const cancelSubscriptionEndpoint = (opts?: ItsRosePluginOptions) => {
	return createAuthEndpoint(
		createRoute("/subscription/cancel"),
		{
			method: "POST",
			use: [sessionMiddleware],
			body: cancelSubscriptionSchema,
		},
		async (ctx) => {
			const { session } = ctx.context;
			const { user } = session;

			const targetSubscription = await getUserSubscription(ctx, user.id);

			if (!targetSubscription) {
				throw new APIError("NOT_FOUND", {
					message: "No active subscription found to cancel.",
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
