import {
	APIError,
	createAuthEndpoint,
	sessionMiddleware,
} from "better-auth/api";
import {
	getSubscriptionById,
	getUserSubscription,
	restoreSubscription,
} from "../../../application";
import { isOwnerOrAdmin } from "../../../domain/permissions";
import { restoreSubscriptionSchema } from "../../../schema";
import type { BillingPluginOptions } from "../../../types";
import { createBillingServices } from "../../bindings";
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
			const { repositories } = createBillingServices(ctx);

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
					message: "No subscription found to restore.",
				});
			}

			if (!isOwnerOrAdmin(user, targetSubscription.user_id)) {
				throw new APIError("FORBIDDEN", {
					message:
						"You do not have permission to perform this action.",
				});
			}

			const restored = await restoreSubscription(
				repositories.subscriptions,
				{
					userId: targetSubscription.user_id,
					subscriptionId: targetSubscription.id,
				}
			);

			return ctx.json({ restored });
		}
	);
};
