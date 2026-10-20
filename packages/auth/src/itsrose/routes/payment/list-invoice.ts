import { createAuthEndpoint, sessionMiddleware } from "better-auth/api";
import { z } from "zod/v4";
import { createRoute, INVOICE_TABLE_NAME } from "../../server";
import type { TransactionInvoice } from "../../types";

export const listInvoiceSchema = z.object({
	status: z.string().optional(),
	limit: z.coerce.number().min(1).max(100).default(20).optional(),
	offset: z.coerce.number().min(0).default(0).optional(),
	user_id: z.string().optional(),
});

export const listInvoiceEndpoint = () => {
	return createAuthEndpoint(
		createRoute("/payment/list-invoice"),
		{
			method: "GET",
			use: [sessionMiddleware],
			query: listInvoiceSchema.optional(),
		},
		async (ctx) => {
			const { session, adapter } = ctx.context;

			// Non-admin users are strictly scoped to their own invoices
			const targetUserId =
				session.user.role === "admin" && ctx.query?.user_id
					? ctx.query.user_id
					: session.user.id;

			const whereClauses: { field: string; value: string }[] = [
				{
					field: "user_id",
					value: targetUserId,
				},
			];

			if (ctx.query?.status) {
				whereClauses.push({
					field: "status",
					value: ctx.query.status,
				});
			}

			const invoices = await adapter.findMany<TransactionInvoice>({
				model: INVOICE_TABLE_NAME,
				where: whereClauses,
				limit: ctx.query?.limit,
				offset: ctx.query?.offset,
			});

			const sorted = (invoices || []).sort((a, b) => {
				const dateA = new Date(a.invoice_date || 0).getTime();
				const dateB = new Date(b.invoice_date || 0).getTime();
				return dateB - dateA;
			});

			return ctx.json(sorted);
		}
	);
};
