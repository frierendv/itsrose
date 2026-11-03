import { createAuthEndpoint, sessionMiddleware } from "better-auth/api";
import { z } from "zod/v4";
import { createRoute, isAdmin, SUBSCRIPTION_TABLE_NAME } from "../../server";
import type { ItsRosePluginOptions, Subscription } from "../../types";

export const listSubscriptionSchema = z.object({
	userId: z.string().optional(),
	status: z.string().optional(),
	limit: z.coerce.number().min(1).max(100).default(50).optional(),
	offset: z.coerce.number().min(0).default(0).optional(),
});

export const listSubscriptionEndpoint = (_opts?: ItsRosePluginOptions) => {
	return createAuthEndpoint(
		createRoute("/subscription/list"),
		{
			method: "GET",
			use: [sessionMiddleware],
			query: listSubscriptionSchema.optional(),
		},
		async (ctx) => {
			const { session, adapter } = ctx.context;
			const isUserAdmin = isAdmin(session.user);

			const whereClauses: { field: string; value: string }[] = [];

			if (!isUserAdmin || ctx.query?.userId) {
				whereClauses.push({
					field: "user_id",
					value: ctx.query?.userId || session.user.id,
				});
			}

			if (ctx.query?.status) {
				whereClauses.push({
					field: "status",
					value: ctx.query.status,
				});
			}

			const subscriptions = await adapter.findMany<Subscription>({
				model: SUBSCRIPTION_TABLE_NAME,
				where: whereClauses,
				limit: ctx.query?.limit,
				offset: ctx.query?.offset,
			});

			return ctx.json(subscriptions || []);
		}
	);
};
