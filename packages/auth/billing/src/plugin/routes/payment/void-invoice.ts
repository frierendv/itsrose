import type { MidtransClient } from "@itsrose/midtrans";
import {
	APIError,
	createAuthEndpoint,
	sessionMiddleware,
} from "better-auth/api";
import { findInvoiceById, voidInvoiceForUser } from "../../../adapter";
import { isOwnerOrAdmin } from "../../../domain/permissions";
import { voidInvoiceSchema } from "../../../schema";
import type { BillingPluginOptions } from "../../../types";
import { createRoute } from "../../route";

export const voidInvoiceEndpoint = (
	client: MidtransClient,
	opts?: BillingPluginOptions
) => {
	return createAuthEndpoint(
		createRoute("/payment/void-invoice"),
		{
			method: "POST",
			use: [sessionMiddleware],
			body: voidInvoiceSchema,
		},
		async (ctx) => {
			const { user } = ctx.context.session;

			const invoice = await findInvoiceById(ctx, ctx.body.invoice_id);

			if (!invoice) {
				throw new APIError("NOT_FOUND", {
					message: `Invoice '${ctx.body.invoice_id}' does not exist.`,
				});
			}

			if (!isOwnerOrAdmin(user, invoice.user_id)) {
				throw new APIError("FORBIDDEN", {
					message: "You are not authorized to void this invoice.",
				});
			}

			const result = await voidInvoiceForUser(
				ctx,
				client,
				{
					invoiceId: ctx.body.invoice_id,
					actorId: user.id,
					reason: ctx.body.reason,
				},
				opts
			);

			switch (result.status) {
				case "not_found":
					throw new APIError("NOT_FOUND", {
						message: `Invoice '${ctx.body.invoice_id}' does not exist.`,
					});
				case "not_voidable":
					throw new APIError("BAD_REQUEST", {
						message: `Cannot void an invoice with status '${result.invoiceStatus}'.`,
					});
				case "gateway_error":
					throw new APIError("CONFLICT", {
						message: result.message,
					});
				case "voided":
					return ctx.json({
						success: true,
						invoice_id: ctx.body.invoice_id,
						status: "voided",
					});
			}
		}
	);
};
