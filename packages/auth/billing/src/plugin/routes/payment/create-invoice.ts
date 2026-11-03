import type { MidtransClient } from "@itsrose/midtrans";
import {
	APIError,
	createAuthEndpoint,
	sessionMiddleware,
} from "better-auth/api";
import { createInvoiceForUser } from "../../../application";
import { createInvoiceSchema } from "../../../schema";
import type { BillingPluginOptions } from "../../../types";
import { createBillingContext } from "../../bindings";
import { createRoute } from "../../route";

export const createInvoiceEndpoint = (
	client: MidtransClient,
	opts?: BillingPluginOptions
) => {
	return createAuthEndpoint(
		createRoute("/payment/create-invoice"),
		{
			method: "POST",
			use: [sessionMiddleware],
			body: createInvoiceSchema,
		},
		async (ctx) => {
			const { user } = ctx.context.session;
			const { dependencies, options } = createBillingContext(
				ctx,
				client,
				opts
			);

			const result = await createInvoiceForUser(
				dependencies,
				{
					userId: user.id,
					user,
					planId: ctx.body.plan_id,
					dueInDays: ctx.body.due_in_days,
					notes: ctx.body.notes,
					customer: ctx.body.customer,
				},
				options
			);

			switch (result.status) {
				case "plan_not_found":
					throw new APIError("NOT_FOUND", {
						message: `Plan '${result.planId}' does not exist.`,
					});
				case "gateway_error":
					throw new APIError("CONFLICT", {
						message: result.message,
					});
				case "rejected":
					throw new APIError("BAD_REQUEST", {
						message: rejectionMessage(result),
					});
				case "created":
					return ctx.json(result.invoice);
			}
		}
	);
};

function rejectionMessage(
	result: Extract<
		Awaited<ReturnType<typeof createInvoiceForUser>>,
		{ status: "rejected" }
	>
): string {
	switch (result.reason) {
		case "free_tier":
			return "The free tier does not require an invoice.";
		case "already_subscribed":
			return `You are already subscribed to the ${result.targetPlan.name}.`;
		case "downgrade":
			return `Target tier '${result.targetPlan.name}' is a downgrade. Please use the downgrade endpoint to schedule this at cycle end.`;
	}
}
