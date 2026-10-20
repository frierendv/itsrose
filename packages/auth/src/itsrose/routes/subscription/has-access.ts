import {
	APIError,
	createAuthEndpoint,
	sessionMiddleware,
} from "better-auth/api";
import { z } from "zod/v4";
import { resolveUserSubscription } from "../../adapter";
import { createRoute, isAdmin } from "../../server";
import type { ItsRosePluginOptions } from "../../types";

export const hasAccessQuerySchema = z.object({
	userId: z.string().optional(),
});

export const hasAccessEndpoint = (_opts?: ItsRosePluginOptions) => {
	return createAuthEndpoint(
		createRoute("/subscription/has-access"),
		{
			method: "GET",
			use: [sessionMiddleware],
			query: hasAccessQuerySchema,
		},
		async (ctx) => {
			const targetUserId =
				ctx.query?.userId || ctx.context.session.user.id;

			if (
				ctx.query?.userId &&
				ctx.query.userId !== ctx.context.session.user.id &&
				!isAdmin(ctx.context.session.user)
			) {
				throw new APIError("FORBIDDEN", {
					message:
						"You do not have permission to check access for other users.",
				});
			}

			const subscriptionAccess = await resolveUserSubscription(
				ctx,
				targetUserId
			);

			return ctx.json(subscriptionAccess);
		}
	);
};
