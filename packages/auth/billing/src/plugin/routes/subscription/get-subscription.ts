import { createAuthEndpoint, sessionMiddleware } from "better-auth/api";
import { getUserSubscription } from "../../../adapter";
import { isOwnerOrAdmin } from "../../../domain/permissions";
import { getSubscriptionSchema } from "../../../schema";
import type { BillingPluginOptions } from "../../../types";
import { createRoute } from "../../route";

export const getSubscriptionEndpoint = (_opts?: BillingPluginOptions) => {
	return createAuthEndpoint(
		createRoute("/subscription/get"),
		{
			method: "GET",
			use: [sessionMiddleware],
			query: getSubscriptionSchema,
		},
		async (ctx) => {
			const { user } = ctx.context.session;
			const targetUserId =
				ctx.query?.user_id && isOwnerOrAdmin(user, ctx.query.user_id)
					? ctx.query.user_id
					: user.id;

			const subscription = await getUserSubscription(ctx, targetUserId);
			return ctx.json(subscription);
		}
	);
};
