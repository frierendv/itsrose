import { APIError, createAuthEndpoint } from "better-auth/api";
import { z } from "zod/v4";
import { getPlanById } from "../../adapter";
import { createRoute } from "../../server";

export const getPlanEndpoint = () => {
	return createAuthEndpoint(
		createRoute("/plan/get"),
		{
			method: "GET",
			query: z.object({
				plan_id: z.string(),
			}),
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
