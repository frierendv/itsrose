import type { MidtransClient } from "@itsrose/midtrans";
import {
	APIError,
	createAuthEndpoint,
	sessionMiddleware,
} from "better-auth/api";
import { z } from "zod/v4";
import {
	createRoute,
	INVOICE_EVENT_TABLE_NAME,
	INVOICE_TABLE_NAME,
} from "../../server";
import type { ItsRosePluginOptions, TransactionInvoice } from "../../types";

export const voidInvoiceSchema = z.object({
	invoice_id: z.string().min(1),
	reason: z.string().max(255).optional(),
});

export const voidInvoiceEndpoint = (
	client: MidtransClient,
	opts?: ItsRosePluginOptions
) => {
	return createAuthEndpoint(
		createRoute("/payment/void-invoice"),
		{
			method: "POST",
			use: [sessionMiddleware],
			body: voidInvoiceSchema,
		},
		async (ctx) => {
			const { session, adapter } = ctx.context;

			const invoice = await adapter.findOne<TransactionInvoice>({
				model: INVOICE_TABLE_NAME,
				where: [{ field: "invoice_id", value: ctx.body.invoice_id }],
			});

			if (!invoice) {
				throw new APIError("NOT_FOUND", {
					message: `Invoice '${ctx.body.invoice_id}' does not exist.`,
				});
			}

			if (
				invoice.user_id !== session.user.id &&
				session.user.role !== "admin"
			) {
				throw new APIError("FORBIDDEN", {
					message: "You are not authorized to void this invoice.",
				});
			}

			const nonVoidableStatuses = [
				"paid",
				"voided",
				"canceled",
				"rejected",
			];
			if (nonVoidableStatuses.includes(invoice.status.toLowerCase())) {
				throw new APIError("BAD_REQUEST", {
					message: `Cannot void an invoice with status '${invoice.status}'.`,
				});
			}

			const { error } = await client.invoice.void(ctx.body.invoice_id);
			if (error) {
				throw new APIError("CONFLICT", {
					message:
						error.error_messages?.join("; ") ||
						"Failed to void Midtrans invoice.",
				});
			}

			const updated = await adapter.update<TransactionInvoice>({
				model: INVOICE_TABLE_NAME,
				where: [{ field: "invoice_id", value: ctx.body.invoice_id }],
				update: {
					status: "voided",
				},
			});

			// Record event audit log
			await adapter.create({
				model: INVOICE_EVENT_TABLE_NAME,
				data: {
					event_name: "invoice.voided",
					event_json: {
						invoice_id: ctx.body.invoice_id,
						order_id: invoice.order_id,
						reason: ctx.body.reason ?? "User voided invoice",
						voided_by: session.user.id,
					},
				},
			});

			const result = updated || { ...invoice, status: "voided" };
			await opts?.onInvoiceVoided?.(result, ctx);

			return ctx.json({
				success: true,
				invoice_id: ctx.body.invoice_id,
				status: "voided",
			});
		}
	);
};
