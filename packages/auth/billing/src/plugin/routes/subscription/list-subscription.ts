import { createAuthEndpoint, sessionMiddleware } from "better-auth/api";
import { createBillingRepositories } from "../../../adapter";
import { isAdmin } from "../../../domain/permissions";
import { listSubscriptionSchema } from "../../../schema";
import type { BillingPluginOptions } from "../../../types";
import { createRoute } from "../../route";

export const listSubscriptionEndpoint = (_opts?: BillingPluginOptions) => {
	return createAuthEndpoint(
		createRoute("/subscription/list"),
		{
			method: "GET",
			use: [sessionMiddleware],
			query: listSubscriptionSchema.optional(),
		},
		async (ctx) => {
			const { user } = ctx.context.session;
			const isUserAdmin = isAdmin(user);

			const scopeToUser = !isUserAdmin || Boolean(ctx.query?.userId);
			const userId = scopeToUser
				? ctx.query?.userId || user.id
				: undefined;

			const repositories = createBillingRepositories(ctx);

			let subscriptions = userId
				? await repositories.subscriptions.findManyByUser(userId)
				: await repositories.subscriptions.findAll();

			if (ctx.query?.status) {
				subscriptions = subscriptions.filter(
					(subscription) => subscription.status === ctx.query?.status
				);
			}

			const offset = ctx.query?.offset ?? 0;
			const limit = ctx.query?.limit ?? 50;

			return ctx.json(subscriptions.slice(offset, offset + limit));
		}
	);
};
