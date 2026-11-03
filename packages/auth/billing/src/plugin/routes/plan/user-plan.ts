import { createAuthEndpoint, sessionMiddleware } from "better-auth/api";
import { resolveUserSubscription } from "../../../adapter";
import { createRoute } from "../../route";

export const userPlanEndpoint = () => {
	return createAuthEndpoint(
		createRoute("/plan/user"),
		{
			method: "GET",
			use: [sessionMiddleware],
		},
		async (ctx) => {
			const subscription = await resolveUserSubscription(
				ctx,
				ctx.context.session.user.id
			);

			return ctx.json(subscription);
		}
	);
};
