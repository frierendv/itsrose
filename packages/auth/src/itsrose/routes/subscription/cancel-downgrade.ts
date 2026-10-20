import {
	APIError,
	createAuthEndpoint,
	sessionMiddleware,
} from "better-auth/api";
import { cancelScheduledDowngrade, getUserSubscription } from "../../adapter";
import { createRoute } from "../../server";
import type { ItsRosePluginOptions } from "../../types";

export const cancelDowngradeEndpoint = (_opts?: ItsRosePluginOptions) => {
	return createAuthEndpoint(
		createRoute("/subscription/cancel-downgrade"),
		{
			method: "POST",
			use: [sessionMiddleware],
		},
		async (ctx) => {
			const { session } = ctx.context;

			const sub = await getUserSubscription(ctx, session.user.id);
			if (!sub) {
				throw new APIError("NOT_FOUND", {
					message: "No active subscription found.",
				});
			}

			if (!sub.scheduled_tier) {
				throw new APIError("BAD_REQUEST", {
					message: "No pending downgrade is scheduled.",
				});
			}

			const reverted = await cancelScheduledDowngrade(
				ctx,
				session.user.id
			);

			if (!reverted) {
				throw new APIError("INTERNAL_SERVER_ERROR", {
					message: "Failed to cancel scheduled downgrade.",
				});
			}

			return ctx.json({
				success: true,
				message:
					"Scheduled downgrade canceled. You will renew on your current plan.",
				current_tier: sub.plan_id,
				scheduled_tier: null,
			});
		}
	);
};
