import type { MidtransClient } from "@itsrose/midtrans";
import { APIError, createAuthEndpoint } from "better-auth/api";
import { processWebhookEvent } from "../../../application";
import type { BillingPluginOptions } from "../../../types";
import { createBillingContext } from "../../bindings";
import { createRoute } from "../../route";

export const webhookEndpoint = (
	client: MidtransClient,
	opts?: BillingPluginOptions
) => {
	return createAuthEndpoint(
		createRoute("/payment/webhook"),
		{
			method: "POST",
			disableBody: true,
			requireRequest: true,
		},
		async (ctx) => {
			if (!ctx.request) {
				throw new APIError("BAD_REQUEST", {
					message: "Invalid request payload.",
				});
			}

			const payload = await ctx.request.json().catch(() => ({}));
			const { dependencies, options } = createBillingContext(
				ctx,
				client,
				opts
			);

			const result = await processWebhookEvent(
				dependencies,
				payload,
				options
			);

			switch (result.status) {
				case "invalid_signature":
					throw new APIError("FORBIDDEN", {
						message: "Transaction signature verification failed.",
					});
				case "logged":
					return ctx.json({ ok: true, status: "logged" });
				case "invoice_not_found":
					return ctx.json({
						ok: true,
						status: "invoice_not_found",
					});
				case "idempotent_skip":
					return ctx.json({
						ok: true,
						status: "idempotent_skip",
						invoice_id: result.invoiceId,
					});
				case "processed":
					return ctx.json({
						ok: true,
						status: result.finalStatus,
						invoice_id: result.invoiceId,
					});
			}
		}
	);
};
