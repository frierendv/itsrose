import { createAuthEndpoint, sessionMiddleware } from "better-auth/api";
import { resolveUserSubscription } from "../../../application";
import { systemClock } from "../../../domain/ports";
import { createBillingServices } from "../../bindings";
import { createRoute } from "../../route";

export const userPlanEndpoint = () => {
	return createAuthEndpoint(
		createRoute("/plan/user"),
		{
			method: "GET",
			use: [sessionMiddleware],
		},
		async (ctx) => {
			const { repositories } = createBillingServices(ctx);
			const subscription = await resolveUserSubscription(
				repositories,
				ctx.context.session.user.id,
				systemClock
			);

			return ctx.json(subscription);
		}
	);
};
