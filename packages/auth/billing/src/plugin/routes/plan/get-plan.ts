import { APIError, createAuthEndpoint } from "better-auth/api";
import { getPlanById } from "../../../adapter";
import { getPlanSchema } from "../../../schema";
import { createRoute } from "../../route";

export const getPlanEndpoint = () => {
	return createAuthEndpoint(
		createRoute("/plan/get"),
		{
			method: "GET",
			query: getPlanSchema,
		},
		async (ctx) => {
			const plan = await getPlanById(ctx, ctx.query.plan_id);
			if (!plan) {
				throw new APIError("NOT_FOUND", {
					message: `Plan '${ctx.query.plan_id}' does not exist.`,
				});
			}

			return ctx.json(plan);
		}
	);
};
