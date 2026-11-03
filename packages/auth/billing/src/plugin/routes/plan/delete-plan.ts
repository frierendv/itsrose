import {
	APIError,
	createAuthEndpoint,
	sessionMiddleware,
} from "better-auth/api";
import { deletePlanRecord } from "../../../application";
import { isAdmin } from "../../../domain/permissions";
import { deletePlanSchema } from "../../../schema";
import { createBillingServices } from "../../bindings";
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

			const { repositories } = createBillingServices(ctx);
			const result = await deletePlanRecord(
				repositories.plans,
				ctx.body.plan_id
			);

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
