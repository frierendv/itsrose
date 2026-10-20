import { createAuthEndpoint, sessionMiddleware } from "better-auth/api";
import { createRoute } from "../../server";
import type { ItsRosePluginOptions } from "../../types";

export const updateSubscriptionEndpoint = (_opts?: ItsRosePluginOptions) => {
	return createAuthEndpoint(
		createRoute("/subscription/update"),
		{
			method: "POST",
			use: [sessionMiddleware],
		},
		async (ctx) => {
			return ctx.json({});
		}
	);
};
