import {
	APIError,
	createAuthEndpoint,
	sessionMiddleware,
} from "better-auth/api";
import {
	getPlanById,
	getUserSubscription,
	scheduleDowngrade,
} from "../../../application";
import { planDowngrade } from "../../../domain/subscription.service";
import { downgradeSubscriptionSchema } from "../../../schema";
import type { BillingPluginOptions } from "../../../types";
import { createBillingServices } from "../../bindings";
import { createRoute } from "../../route";

export const downgradeSubscriptionEndpoint = (_opts?: BillingPluginOptions) => {
	return createAuthEndpoint(
		createRoute("/subscription/downgrade"),
		{
			method: "POST",
			use: [sessionMiddleware],
			body: downgradeSubscriptionSchema,
		},
		async (ctx) => {
			const { user } = ctx.context.session;
			const targetPlanId = ctx.body.target_tier.toLowerCase();
			const { repositories } = createBillingServices(ctx);

			const subscription = await getUserSubscription(
				repositories.subscriptions,
				user.id
			);
			const decision = planDowngrade(subscription, targetPlanId);

			if (decision.action === "reject") {
				if (decision.reason === "no_active_subscription") {
					throw new APIError("BAD_REQUEST", {
						message:
							"No active subscription found to schedule a downgrade.",
					});
				}

				if (decision.reason === "same_tier") {
					throw new APIError("BAD_REQUEST", {
						message: `You are already on the '${targetPlanId}' tier.`,
					});
				}

				throw new APIError("BAD_REQUEST", {
					message: `Target tier '${targetPlanId}' is not a downgrade from '${decision.currentTier}'. Use the upgrade endpoint instead.`,
				});
			}

			// Free is always a valid downgrade target; paid targets must exist.
			if (targetPlanId !== "free") {
				const plan = await getPlanById(
					repositories.plans,
					targetPlanId
				);
				if (!plan) {
					throw new APIError("NOT_FOUND", {
						message: `Plan '${targetPlanId}' does not exist.`,
					});
				}
			}

			const updated = await scheduleDowngrade(
				repositories.subscriptions,
				user.id,
				targetPlanId
			);

			if (!updated) {
				throw new APIError("INTERNAL_SERVER_ERROR", {
					message: "Failed to schedule downgrade.",
				});
			}

			return ctx.json({
				success: true,
				message:
					"Downgrade scheduled successfully. You retain full access to your current tier until the end of your billing cycle.",
				current_tier: subscription?.plan_id,
				scheduled_tier: targetPlanId,
				effective_date: subscription?.period_end,
				retains_access_until: subscription?.period_end,
			});
		}
	);
};
