import {
	APIError,
	createAuthEndpoint,
	sessionMiddleware,
} from "better-auth/api";
import { createPlanRecord } from "../../../application";
import { isAdmin } from "../../../domain/permissions";
import { createPlanSchema } from "../../../schema";
import { createBillingServices } from "../../bindings";
import { createRoute } from "../../route";

export const createPlanEndpoint = () => {
	return createAuthEndpoint(
		createRoute("/plan/create"),
		{
			method: "POST",
			use: [sessionMiddleware],
			body: createPlanSchema,
		},
		async (ctx) => {
			if (!isAdmin(ctx.context.session.user)) {
				throw new APIError("FORBIDDEN", {
					message: "Admin role required to create billing plans.",
				});
			}

			const { repositories } = createBillingServices(ctx);
			const result = await createPlanRecord(repositories.plans, ctx.body);

			if (result.status === "conflict") {
				throw new APIError("CONFLICT", {
					message: `Plan with plan_id '${ctx.body.plan_id}' already exists.`,
				});
			}

			if (result.status === "created") {
				return ctx.json(result.plan);
			}

			throw new APIError("INTERNAL_SERVER_ERROR", {
				message: "Failed to create billing plan.",
			});
		}
	);
};
