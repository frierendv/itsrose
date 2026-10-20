import { createAuthEndpoint, sessionMiddleware } from "better-auth/api";
import { createRoute, SUBSCRIPTION_TABLE_NAME } from "../../server";
import type { ItsRosePluginOptions, Subscription } from "../../types";

export const listSubscriptionEndpoint = (_opts?: ItsRosePluginOptions) => {
	return createAuthEndpoint(
		createRoute("/subscription/list"),
		{
			method: "GET",
			use: [sessionMiddleware],
		},
		async (ctx) => {
			const { session, adapter } = ctx.context;
			const subscriptions = await adapter.findMany<Subscription>({
				model: SUBSCRIPTION_TABLE_NAME,
				where: [{ field: "user_id", value: session.user.id }],
			});

			return ctx.json(subscriptions || []);
		}
	);
};
