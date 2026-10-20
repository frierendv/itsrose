import {
	APIError,
	createAuthEndpoint,
	sessionMiddleware,
} from "better-auth/api";
import { z } from "zod/v4";
import {
	getPlanById,
	getUserSubscription,
	scheduleDowngrade,
} from "../../adapter";
import {
	createRoute,
	isTierDowngrade,
	SUBSCRIPTION_STATUS,
} from "../../server";
import type { ItsRosePluginOptions } from "../../types";

export const downgradeSubscriptionSchema = z.object({
	target_tier: z.string().min(1),
});

export const downgradeSubscriptionEndpoint = (_opts?: ItsRosePluginOptions) => {
	return createAuthEndpoint(
		createRoute("/subscription/downgrade"),
		{
			method: "POST",
			use: [sessionMiddleware],
			body: downgradeSubscriptionSchema,
		},
		async (ctx) => {
			const { session } = ctx.context;
			const targetPlanId = ctx.body.target_tier.toLowerCase();

			const sub = await getUserSubscription(ctx, session.user.id);
			if (!sub || sub.status !== SUBSCRIPTION_STATUS.ACTIVE) {
				throw new APIError("BAD_REQUEST", {
					message:
						"No active subscription found to schedule a downgrade.",
				});
			}

			const currentTier = sub.plan_id.toLowerCase();

			if (currentTier === targetPlanId) {
				throw new APIError("BAD_REQUEST", {
					message: `You are already on the '${targetPlanId}' tier.`,
				});
			}

			if (!isTierDowngrade(currentTier, targetPlanId)) {
				throw new APIError("BAD_REQUEST", {
					message: `Target tier '${targetPlanId}' is not a downgrade from '${currentTier}'. Use the upgrade endpoint instead.`,
				});
			}

			// Validate plan exists if not free
			if (targetPlanId !== "free") {
				const plan = await getPlanById(ctx, targetPlanId);
				if (!plan) {
					throw new APIError("NOT_FOUND", {
						message: `Plan '${targetPlanId}' does not exist.`,
					});
				}
			}

			const updated = await scheduleDowngrade(
				ctx,
				session.user.id,
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
				current_tier: sub.plan_id,
				scheduled_tier: targetPlanId,
				effective_date: sub.period_end,
				retains_access_until: sub.period_end,
			});
		}
	);
};
