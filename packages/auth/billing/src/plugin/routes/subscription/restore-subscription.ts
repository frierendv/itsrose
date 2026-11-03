import {
	APIError,
	createAuthEndpoint,
	sessionMiddleware,
} from "better-auth/api";
import {
	getSubscriptionById,
	getUserSubscription,
	restoreSubscription,
} from "../../../adapter";
import { isOwnerOrAdmin } from "../../../domain/permissions";
import { restoreSubscriptionSchema } from "../../../schema";
import type { BillingPluginOptions } from "../../../types";
import { createRoute } from "../../route";

export const restoreSubscriptionEndpoint = (_opts?: BillingPluginOptions) => {
	return createAuthEndpoint(
		createRoute("/subscription/restore"),
		{
			method: "POST",
			use: [sessionMiddleware],
			body: restoreSubscriptionSchema,
		},
		async (ctx) => {
			const { user } = ctx.context.session;

			const targetSubscription = ctx.body.subscription_id
				? await getSubscriptionById(ctx, ctx.body.subscription_id)
				: await getUserSubscription(ctx, user.id);

			if (!targetSubscription) {
				throw new APIError("NOT_FOUND", {
					message: "No subscription found to restore.",
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
