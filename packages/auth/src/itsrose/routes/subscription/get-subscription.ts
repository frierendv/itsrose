import { createAuthEndpoint, sessionMiddleware } from "better-auth/api";
import { getUserSubscription } from "../../adapter";
import { createRoute } from "../../server";
import type { ItsRosePluginOptions } from "../../types";

export const getSubscriptionEndpoint = (_opts?: ItsRosePluginOptions) => {
	return createAuthEndpoint(
		createRoute("/subscription/get"),
		{
			method: "GET",
			use: [sessionMiddleware],
		},
		async (ctx) => {
			const subscription = await getUserSubscription(
				ctx,
				ctx.context.session.user.id
			);
			return ctx.json(subscription);
		}
	);
};
