import { createAuthEndpoint } from "better-auth/api";
import { getAllPlans } from "../../adapter";
import { createRoute } from "../../server";
import type { ItsRosePluginOptions } from "../../types";

export const listPlanEndpoint = (opts?: ItsRosePluginOptions) => {
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
