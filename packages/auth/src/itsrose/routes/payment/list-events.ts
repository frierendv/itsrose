import {
	APIError,
	createAuthEndpoint,
	sessionMiddleware,
} from "better-auth/api";
import { z } from "zod/v4";
import { createRoute, INVOICE_EVENT_TABLE_NAME, isAdmin } from "../../server";
import type { TransactionInvoiceEvent } from "../../types";

export const listEventsSchema = z.object({
	limit: z.coerce.number().min(1).max(100).default(50).optional(),
	offset: z.coerce.number().min(0).default(0).optional(),
	event_name: z.string().optional(),
});

export const listEventsEndpoint = () => {
	return createAuthEndpoint(
		createRoute("/payment/list-events"),
		{
			method: "GET",
			use: [sessionMiddleware],
			query: listEventsSchema.optional(),
		},
		async (ctx) => {
			const { session, adapter } = ctx.context;

			if (!isAdmin(session.user)) {
				throw new APIError("FORBIDDEN", {
					message: "Admin role required to view transaction events.",
				});
			}

			const whereClauses: { field: string; value: string }[] = [];

			if (ctx.query?.event_name) {
				whereClauses.push({
					field: "event_name",
					value: ctx.query.event_name,
				});
			}

			const events = await adapter.findMany<TransactionInvoiceEvent>({
				model: INVOICE_EVENT_TABLE_NAME,
				where: whereClauses,
				limit: ctx.query?.limit,
				offset: ctx.query?.offset,
				sortBy: {
					field: "created_at",
					direction: "desc",
				},
			});

			const sorted = (events || []).sort((a, b) => {
				const dateA = new Date(
					a.created_at || (a as any).createdAt || 0
				).getTime();
				const dateB = new Date(
					b.created_at || (b as any).createdAt || 0
				).getTime();
				return dateB - dateA;
			});

			return ctx.json(sorted);
		}
	);
};
