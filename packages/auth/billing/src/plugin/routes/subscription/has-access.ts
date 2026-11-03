import {
	APIError,
	createAuthEndpoint,
	sessionMiddleware,
} from "better-auth/api";
import { resolveUserSubscription } from "../../../adapter";
import { isAdmin } from "../../../domain/permissions";
import { hasAccessQuerySchema } from "../../../schema";
import type { BillingPluginOptions } from "../../../types";
import { createRoute } from "../../route";

export const hasAccessEndpoint = (_opts?: BillingPluginOptions) => {
	return createAuthEndpoint(
		createRoute("/subscription/has-access"),
		{
			method: "GET",
			use: [sessionMiddleware],
			query: hasAccessQuerySchema,
		},
		async (ctx) => {
			const { user } = ctx.context.session;
			const targetUserId = ctx.query?.userId || user.id;

			if (
				ctx.query?.userId &&
				ctx.query.userId !== user.id &&
				!isAdmin(user)
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
