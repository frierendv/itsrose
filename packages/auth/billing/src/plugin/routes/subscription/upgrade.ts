import type { MidtransClient } from "@itsrose/midtrans";
import {
	APIError,
	createAuthEndpoint,
	sessionMiddleware,
} from "better-auth/api";
import { createUpgradeInvoiceForUser } from "../../../adapter";
import { upgradeSubscriptionSchema } from "../../../schema";
import type { BillingPluginOptions } from "../../../types";
import { createRoute } from "../../route";

export const upgradeSubscriptionEndpoint = (
	client: MidtransClient,
	opts?: BillingPluginOptions
) => {
	return createAuthEndpoint(
		createRoute("/subscription/upgrade"),
		{
			method: "POST",
			use: [sessionMiddleware],
			body: upgradeSubscriptionSchema,
		},
		async (ctx) => {
			const { user } = ctx.context.session;

			const result = await createUpgradeInvoiceForUser(
				ctx,
				client,
				{
					userId: user.id,
					user,
					targetTier: ctx.body.target_tier,
					notes: ctx.body.notes,
					customer: ctx.body.customer,
				},
				opts
			);

			switch (result.status) {
				case "plan_not_found":
					throw new APIError("NOT_FOUND", {
						message: `Target plan '${result.planId}' does not exist.`,
					});
				case "gateway_error":
					throw new APIError("CONFLICT", {
						message: result.message,
					});
				case "rejected":
					throw new APIError("BAD_REQUEST", {
						message: upgradeRejectionMessage(result),
					});
				case "created":
					return ctx.json({
						invoice: result.invoice,
						proration: result.prorationDetails,
					});
			}
		}
	);
};

function upgradeRejectionMessage(
	result: Extract<
		Awaited<ReturnType<typeof createUpgradeInvoiceForUser>>,
		{ status: "rejected" }
	>
): string {
	switch (result.reason) {
		case "free_tier":
			return "Cannot upgrade to the free tier. Use the downgrade or cancel endpoint instead.";
		case "already_subscribed":
			return `You are already subscribed to the ${result.targetPlan.name}.`;
		case "downgrade":
			return `Target tier '${result.targetPlan.name}' is a downgrade. Please use the downgrade endpoint to schedule this at cycle end.`;
	}
}
