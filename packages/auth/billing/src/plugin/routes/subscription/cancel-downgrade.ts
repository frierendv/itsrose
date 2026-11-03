import {
	APIError,
	createAuthEndpoint,
	sessionMiddleware,
} from "better-auth/api";
import {
	cancelScheduledDowngrade,
	getUserSubscription,
} from "../../../adapter";
import { planCancelDowngrade } from "../../../domain/subscription.service";
import type { BillingPluginOptions } from "../../../types";
import { createRoute } from "../../route";

export const cancelDowngradeEndpoint = (_opts?: BillingPluginOptions) => {
	return createAuthEndpoint(
		createRoute("/subscription/cancel-downgrade"),
		{
			method: "POST",
			use: [sessionMiddleware],
		},
		async (ctx) => {
			const { user } = ctx.context.session;

			const subscription = await getUserSubscription(ctx, user.id);
			const decision = planCancelDowngrade(subscription);

			if (decision.action === "reject") {
				if (decision.reason === "no_subscription") {
					throw new APIError("NOT_FOUND", {
						message: "No active subscription found.",
					});
				}

				throw new APIError("BAD_REQUEST", {
					message: "No pending downgrade is scheduled.",
				});
			}

			const reverted = await cancelScheduledDowngrade(ctx, user.id);

			if (!reverted) {
				throw new APIError("INTERNAL_SERVER_ERROR", {
					message: "Failed to cancel scheduled downgrade.",
				});
			}

			return ctx.json({
				success: true,
				message:
					"Scheduled downgrade canceled. You will renew on your current plan.",
				current_tier: subscription?.plan_id,
				scheduled_tier: null,
			});
		}
	);
};
