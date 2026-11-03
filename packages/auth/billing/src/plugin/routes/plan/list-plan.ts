import { createAuthEndpoint } from "better-auth/api";
import { getAllPlans } from "../../../application";
import type { BillingPluginOptions } from "../../../types";
import { createBillingServices } from "../../bindings";
import { createRoute } from "../../route";

export const listPlanEndpoint = (opts?: BillingPluginOptions) => {
	return createAuthEndpoint(
		createRoute("/plan/list"),
		{
			method: "GET",
		},
		async (ctx) => {
			const { repositories, options } = createBillingServices(ctx, opts);
			const plans = await getAllPlans(
				repositories.plans,
				options.defaultPlans
			);
			return ctx.json(plans);
		}
	);
};
