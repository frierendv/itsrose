import type { MidtransClient } from "@itsrose/midtrans";
import {
	APIError,
	createAuthEndpoint,
	sessionMiddleware,
} from "better-auth/api";
import { findInvoiceById, syncInvoiceWithMidtrans } from "../../../adapter";
import { isOwnerOrAdmin } from "../../../domain/permissions";
import { getInvoiceSchema } from "../../../schema";
import { createRoute } from "../../route";

export const getInvoiceEndpoint = (client: MidtransClient) => {
	return createAuthEndpoint(
		createRoute("/payment/get-invoice"),
		{
			method: "GET",
			use: [sessionMiddleware],
			query: getInvoiceSchema,
		},
		async (ctx) => {
			const invoice = await findInvoiceById(ctx, ctx.query.invoice_id);

			if (!invoice) {
				throw new APIError("NOT_FOUND", {
					message: `Invoice '${ctx.query.invoice_id}' does not exist.`,
				});
			}

			if (!isOwnerOrAdmin(ctx.context.session.user, invoice.user_id)) {
				throw new APIError("FORBIDDEN", {
					message: "You are not authorized to view this invoice.",
				});
			}

			const synced = await syncInvoiceWithMidtrans(ctx, client, invoice);
			return ctx.json(synced);
		}
	);
};
