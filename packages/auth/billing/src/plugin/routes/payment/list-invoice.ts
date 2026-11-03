import { createAuthEndpoint, sessionMiddleware } from "better-auth/api";
import { listInvoices } from "../../../adapter";
import { isAdmin } from "../../../domain/permissions";
import { listInvoiceSchema } from "../../../schema";
import { createRoute } from "../../route";

export const listInvoiceEndpoint = () => {
	return createAuthEndpoint(
		createRoute("/payment/list-invoice"),
		{
			method: "GET",
			use: [sessionMiddleware],
			query: listInvoiceSchema.optional(),
		},
		async (ctx) => {
			const { user } = ctx.context.session;
			const isUserAdmin = isAdmin(user);
			const scopeToUser = !isUserAdmin || Boolean(ctx.query?.user_id);

			const invoices = await listInvoices(ctx, {
				userId: scopeToUser ? ctx.query?.user_id || user.id : undefined,
				status: ctx.query?.status,
				invoiceType: ctx.query?.invoice_type,
				limit: ctx.query?.limit,
				offset: ctx.query?.offset,
			});

			return ctx.json(invoices);
		}
	);
};
