import {
	APIError,
	createAuthEndpoint,
	sessionMiddleware,
} from "better-auth/api";
import { updatePlanRecord } from "../../../application";
import { isAdmin } from "../../../domain/permissions";
import { updatePlanSchema } from "../../../schema";
import { createBillingServices } from "../../bindings";
import { createRoute } from "../../route";

export const updatePlanEndpoint = () => {
	return createAuthEndpoint(
		createRoute("/plan/update"),
		{
			method: "POST",
			use: [sessionMiddleware],
			body: updatePlanSchema,
		},
		async (ctx) => {
			if (!isAdmin(ctx.context.session.user)) {
				throw new APIError("FORBIDDEN", {
					message: "Admin role required to update billing plans.",
				});
			}

			const { repositories } = createBillingServices(ctx);
			const result = await updatePlanRecord(repositories.plans, ctx.body);

			if (result.status === "not_found") {
				throw new APIError("NOT_FOUND", {
					message: `Plan with plan_id '${ctx.body.plan_id}' does not exist.`,
				});
			}

			if (result.status === "updated" || result.status === "deleted") {
				return ctx.json(result.plan);
			}

			throw new APIError("INTERNAL_SERVER_ERROR", {
				message: "Failed to update billing plan.",
			});
		}
	);
};
