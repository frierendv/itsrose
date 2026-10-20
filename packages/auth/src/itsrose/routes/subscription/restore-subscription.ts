import { APIError } from "better-auth";
import { createAuthEndpoint, sessionMiddleware } from "better-auth/api";
import { z } from "zod/v4";
import { getUserSubscription, restoreSubscription } from "../../adapter";
import { createRoute, isOwnerOrAdmin } from "../../server";
import type { ItsRosePluginOptions } from "../../types";

export const restoreSubscriptionSchema = z.object({
	subscription_id: z.string().optional(),
	cancel_at_period_end: z.boolean().optional().default(true),
});

export const restoreSubscriptionEndpoint = (_opts?: ItsRosePluginOptions) => {
	return createAuthEndpoint(
		createRoute("/subscription/restore"),
		{
			method: "POST",
			use: [sessionMiddleware],
			body: restoreSubscriptionSchema,
		},
		async (ctx) => {
			const { session } = ctx.context;
			const { user } = session;

			const targetSubscription = await getUserSubscription(ctx, user.id);

			if (!targetSubscription) {
				throw new APIError("NOT_FOUND", {
					message: "No active subscription found to restore.",
				});
			}

			if (!isOwnerOrAdmin(user, targetSubscription.user_id)) {
				throw new APIError("FORBIDDEN", {
					message:
						"You do not have permission to perform this action.",
				});
			}

			const restored = await restoreSubscription(ctx, {
				userId: targetSubscription.user_id,
				subscriptionId: targetSubscription.id,
			});

			return ctx.json({ restored });
		}
	);
};
