import type { MidtransClient } from "@itsrose/midtrans";
import { APIError, createAuthEndpoint } from "better-auth/api";
import { z } from "zod/v4";
import { createRoute, isAdmin, runAllBillingCronTasks } from "../../server";
import type { ItsRosePluginOptions } from "../../types";

export const billingCronSchema = z.object({
	secret: z.string().optional(),
	lead_days: z.number().int().min(1).max(14).optional(),
	grace_days: z.number().int().min(1).max(14).optional(),
});

export const runBillingCronEndpoint = (
	client: MidtransClient,
	opts?: ItsRosePluginOptions
) => {
	return createAuthEndpoint(
		createRoute("/subscription/cron"),
		{
			method: "POST",
			body: billingCronSchema,
		},
		async (ctx) => {
			// Require either admin session or secret header
			const authHeader = ctx.request?.headers?.get("Authorization");
			// eslint-disable-next-line turbo/no-undeclared-env-vars
			const cronSecret = process.env.BILLING_CRON_SECRET;

			const hasValidSecret =
				cronSecret &&
				(ctx.body?.secret === cronSecret ||
					authHeader === `Bearer ${cronSecret}`);

			const hasAdminSession =
				ctx.context.session?.user && isAdmin(ctx.context.session.user);

			if (!hasValidSecret && !hasAdminSession) {
				throw new APIError("FORBIDDEN", {
					message:
						"Unauthorized. Admin privileges or valid cron secret required.",
				});
			}

			const leadMs = ctx.body?.lead_days
				? ctx.body.lead_days * 24 * 60 * 60 * 1000
				: undefined;
			const graceMs = ctx.body?.grace_days
				? ctx.body.grace_days * 24 * 60 * 60 * 1000
				: undefined;

			const result = await runAllBillingCronTasks(ctx, client, {
				leadMs,
				graceMs,
				pluginOpts: opts,
			});

			return ctx.json({
				success: true,
				...result,
			});
		}
	);
};
