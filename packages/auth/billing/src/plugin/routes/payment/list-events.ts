import {
	APIError,
	createAuthEndpoint,
	sessionMiddleware,
} from "better-auth/api";
import { listInvoiceEvents } from "../../../adapter";
import { isAdmin } from "../../../domain/permissions";
import { listEventsSchema } from "../../../schema";
import { createRoute } from "../../route";

export const listEventsEndpoint = () => {
	return createAuthEndpoint(
		createRoute("/payment/list-events"),
		{
			method: "GET",
			use: [sessionMiddleware],
			query: listEventsSchema.optional(),
		},
		async (ctx) => {
			if (!isAdmin(ctx.context.session.user)) {
				throw new APIError("FORBIDDEN", {
					message: "Admin role required to view transaction events.",
				});
			}

			const events = await listInvoiceEvents(ctx, {
				eventName: ctx.query?.event_name,
				limit: ctx.query?.limit,
				offset: ctx.query?.offset,
			});

			return ctx.json(events);
		}
	);
};
