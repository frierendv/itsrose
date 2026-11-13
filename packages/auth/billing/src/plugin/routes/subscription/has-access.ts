import {
	APIError,
	createAuthEndpoint,
	sessionMiddleware,
} from "better-auth/api";
import { resolveUserSubscription } from "../../../application";
import { isAdmin } from "../../../domain/permissions";
import { systemClock } from "../../../domain/ports";
import { hasAccessQuerySchema } from "../../../schema";
import type { BillingPluginOptions } from "../../../types";
import { createBillingServices } from "../../bindings";
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
			const targetUserId = ctx.query?.user_id || user.id;

			if (
				ctx.query?.user_id &&
				ctx.query.user_id !== user.id &&
				!isAdmin(user)
			) {
				throw new APIError("FORBIDDEN", {
					message:
						"You do not have permission to check access for other users.",
				});
			}

			const { repositories } = createBillingServices(ctx);
			const subscriptionAccess = await resolveUserSubscription(
				repositories,
				targetUserId,
				systemClock
			);

			return ctx.json(subscriptionAccess);
		}
	);
};
