import {
	APIError,
	createAuthEndpoint,
	sessionMiddleware,
} from "better-auth/api";
import { z } from "zod/v4";
import { getUserSubscription } from "../../adapter";
import { createRoute, isOwnerOrAdmin } from "../../server";
import type { ItsRosePluginOptions } from "../../types";

export const getSubscriptionSchema = z.object({
	/** If not admin, this field is ignored. @default "session.user.id" */
	user_id: z.string().optional(),
	subscription_id: z.string().optional(),
});

export const getSubscriptionEndpoint = (_opts?: ItsRosePluginOptions) => {
	return createAuthEndpoint(
		createRoute("/subscription/get"),
		{
			method: "GET",
			use: [sessionMiddleware],
			query: getSubscriptionSchema,
		},
		async (ctx) => {
			const { session } = ctx.context;
			const subscription = await getUserSubscription(
				ctx,
				ctx.query?.user_id &&
					isOwnerOrAdmin(session.user, ctx.query.user_id)
					? ctx.query.user_id
					: session.user.id
			);
			return ctx.json(subscription);
		}
	);
};
