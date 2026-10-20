import {
	APIError,
	createAuthEndpoint,
	sessionMiddleware,
} from "better-auth/api";
import { z } from "zod/v4";
import { getAllPlans, seedDefaultPlans } from "../../adapter";
import { createRoute, isAdmin } from "../../server";
import type { ItsRosePluginOptions } from "../../types";

export const seedPlansEndpoint = (opts?: ItsRosePluginOptions) => {
	return createAuthEndpoint(
		createRoute("/plan/seed"),
		{
			method: "POST",
			use: [sessionMiddleware],
			body: z.object({
				force: z.boolean().optional().default(false),
			}),
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
