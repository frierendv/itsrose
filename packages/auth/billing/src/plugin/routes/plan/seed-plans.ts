import {
	APIError,
	createAuthEndpoint,
	sessionMiddleware,
} from "better-auth/api";
import { getAllPlans, seedDefaultPlans } from "../../../adapter";
import { isAdmin } from "../../../domain/permissions";
import { seedPlansSchema } from "../../../schema";
import type { BillingPluginOptions } from "../../../types";
import { createRoute } from "../../route";

export const seedPlansEndpoint = (opts?: BillingPluginOptions) => {
	return createAuthEndpoint(
		createRoute("/plan/seed"),
		{
			method: "POST",
			use: [sessionMiddleware],
			body: seedPlansSchema,
		},
		async (ctx) => {
			if (!isAdmin(ctx.context.session.user)) {
				throw new APIError("FORBIDDEN", {
					message: "Admin role required to seed billing plans.",
				});
			}

			await seedDefaultPlans(ctx, opts?.defaultPlans);
			const plans = await getAllPlans(ctx, opts?.defaultPlans);

			return ctx.json({
				success: true,
				count: plans.length,
				plans,
			});
		}
	);
};
