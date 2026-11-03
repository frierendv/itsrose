import type { MidtransClient } from "@itsrose/midtrans";
import {
	APIError,
	createAuthEndpoint,
	sessionMiddleware,
} from "better-auth/api";
import { findInvoiceById, syncInvoiceWithMidtrans } from "../../../application";
import { isOwnerOrAdmin } from "../../../domain/permissions";
import { getInvoiceSchema } from "../../../schema";
import { createBillingContext } from "../../bindings";
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
			const { dependencies } = createBillingContext(ctx, client);
			const invoice = await findInvoiceById(
				dependencies,
				ctx.query.invoice_id
			);

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

			const synced = await syncInvoiceWithMidtrans(dependencies, invoice);
			return ctx.json(synced);
		}
	);
};
