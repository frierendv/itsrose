import {
	APIError,
	createAuthEndpoint,
	sessionMiddleware,
} from "better-auth/api";
import { deletePlanRecord } from "../../../adapter";
import { isAdmin } from "../../../domain/permissions";
import { deletePlanSchema } from "../../../schema";
import { createRoute } from "../../route";

export const deletePlanEndpoint = () => {
	return createAuthEndpoint(
		createRoute("/plan/delete"),
		{
			method: "POST",
			use: [sessionMiddleware],
			body: deletePlanSchema,
		},
		async (ctx) => {
			if (!isAdmin(ctx.context.session.user)) {
				throw new APIError("FORBIDDEN", {
					message: "Admin role required to delete billing plans.",
				});
			}

			const result = await deletePlanRecord(ctx, ctx.body.plan_id);

			if (result.status === "not_found") {
				throw new APIError("NOT_FOUND", {
					message: `Plan with plan_id '${ctx.body.plan_id}' does not exist.`,
				});
			}

			return ctx.json({
				success: true,
				plan_id: ctx.body.plan_id,
			});
		}
	);
};
