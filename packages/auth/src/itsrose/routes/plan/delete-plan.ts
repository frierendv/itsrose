import {
	APIError,
	createAuthEndpoint,
	sessionMiddleware,
} from "better-auth/api";
import { z } from "zod/v4";
import { API_PLAN_TABLE_NAME, createRoute, isAdmin } from "../../server";

export const deletePlanEndpoint = () => {
	return createAuthEndpoint(
		createRoute("/plan/delete"),
		{
			method: "POST",
			use: [sessionMiddleware],
			body: z.object({
				plan_id: z.string().min(1),
			}),
		},
		async (ctx) => {
			const { session, adapter } = ctx.context;

			if (!isAdmin(session.user)) {
				throw new APIError("FORBIDDEN", {
					message: "Admin role required to delete billing plans.",
				});
			}

			const existing = await adapter.findOne({
				model: API_PLAN_TABLE_NAME,
				where: [{ field: "plan_id", value: ctx.body.plan_id }],
			});

			if (!existing) {
				throw new APIError("NOT_FOUND", {
					message: `Plan with plan_id '${ctx.body.plan_id}' does not exist.`,
				});
			}

			await adapter.delete({
				model: API_PLAN_TABLE_NAME,
				where: [{ field: "plan_id", value: ctx.body.plan_id }],
			});

			return ctx.json({
				success: true,
				plan_id: ctx.body.plan_id,
			});
		}
	);
};
