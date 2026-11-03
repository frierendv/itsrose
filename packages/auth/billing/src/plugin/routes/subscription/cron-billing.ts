import type { MidtransClient } from "@itsrose/midtrans";
import {
	APIError,
	createAuthEndpoint,
	getSessionFromCtx,
} from "better-auth/api";
import { runAllBillingCronTasks } from "../../../adapter";
import { isAdmin } from "../../../domain/permissions";
import { billingCronSchema } from "../../../schema";
import type { BillingPluginOptions } from "../../../types";
import { createRoute } from "../../route";

const DAY_MS = 24 * 60 * 60 * 1000;

export const runBillingCronEndpoint = (
	client: MidtransClient,
	opts?: BillingPluginOptions
) => {
	return createAuthEndpoint(
		createRoute("/subscription/cron"),
		{
			method: "POST",
			body: billingCronSchema,
		},
		async (ctx) => {
			const authHeader = ctx.request?.headers?.get("Authorization");
			// eslint-disable-next-line turbo/no-undeclared-env-vars
			const cronSecret = process.env.BILLING_CRON_SECRET;

			const hasValidSecret = Boolean(
				cronSecret &&
				(ctx.body?.secret === cronSecret ||
					authHeader === `Bearer ${cronSecret}`)
			);

			const session = await getSessionFromCtx(ctx);
			const hasAdminSession = Boolean(session && isAdmin(session.user));

			if (!hasValidSecret && !hasAdminSession) {
				throw new APIError("FORBIDDEN", {
					message:
						"Unauthorized. Admin privileges or valid cron secret required.",
				});
			}

			const leadMs = ctx.body?.lead_days
				? ctx.body.lead_days * DAY_MS
				: undefined;
			const graceMs = ctx.body?.grace_days
				? ctx.body.grace_days * DAY_MS
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
