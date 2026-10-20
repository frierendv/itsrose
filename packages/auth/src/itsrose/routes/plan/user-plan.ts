import { createAuthEndpoint, sessionMiddleware } from "better-auth/api";
import { resolveUserSubscription } from "../../adapter";
import { createRoute } from "../../server";

export const userPlanEndpoint = () => {
	return createAuthEndpoint(
		createRoute("/plan/user"),
		{
			method: "GET",
			use: [sessionMiddleware],
		},
		async (ctx) => {
			const { session } = ctx.context;
			const subscription = await resolveUserSubscription(
				ctx,
				session.user.id
			);

			return ctx.json(subscription);
		}
	);
};
