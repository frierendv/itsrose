import { createAuthEndpoint } from "better-auth/api";
import { getAllPlans } from "../../../adapter";
import type { BillingPluginOptions } from "../../../types";
import { createRoute } from "../../route";

export const listPlanEndpoint = (opts?: BillingPluginOptions) => {
	return createAuthEndpoint(
		createRoute("/plan/list"),
		{
			method: "GET",
		},
		async (ctx) => {
			const plans = await getAllPlans(ctx, opts?.defaultPlans);
			return ctx.json(plans);
		}
	);
};
