import type { MidtransClient } from "@itsrose/midtrans";
import {
	APIError,
	createAuthEndpoint,
	sessionMiddleware,
} from "better-auth/api";
import { z } from "zod/v4";
import { createRoute, INVOICE_TABLE_NAME } from "../../server";
import type { TransactionInvoice } from "../../types";

export const getInvoiceEndpoint = (client: MidtransClient) => {
	return createAuthEndpoint(
		createRoute("/payment/get-invoice"),
		{
			method: "GET",
			use: [sessionMiddleware],
			query: z.object({
				invoice_id: z.string().min(1),
			}),
		},
		async (ctx) => {
			const { session, adapter } = ctx.context;

			const invoice = await adapter.findOne<TransactionInvoice>({
				model: INVOICE_TABLE_NAME,
				where: [{ field: "invoice_id", value: ctx.query.invoice_id }],
			});

			if (!invoice) {
				throw new APIError("NOT_FOUND", {
					message: `Invoice '${ctx.query.invoice_id}' does not exist.`,
				});
			}

			// Verify user ownership or admin privilege
			if (
				invoice.user_id !== session.user.id &&
				session.user.role !== "admin"
			) {
				throw new APIError("FORBIDDEN", {
					message: "You are not authorized to view this invoice.",
				});
			}

			// Auto-sync status with Midtrans if invoice is still pending or published
			if (
				invoice.status === "pending" ||
				invoice.status === "published"
			) {
				try {
					const { data, error } = await client.invoice.get(
						ctx.query.invoice_id
					);

					if (data && !error && data.status !== invoice.status) {
						const updatePayload: Partial<TransactionInvoice> = {
							status: data.status,
							pdf_url: data.pdf_url ?? invoice.pdf_url,
							paid_pdf_url:
								data.paid_pdf_url ?? invoice.paid_pdf_url,
							paid_date: data.paid_date ?? invoice.paid_date,
						};

						await adapter.update({
							model: INVOICE_TABLE_NAME,
							where: [
								{
									field: "invoice_id",
									value: ctx.query.invoice_id,
								},
							],
							update: updatePayload,
						});

						Object.assign(invoice, updatePayload);
					}
				} catch {
					// Fall through safely if Midtrans upstream is temporarily unreachable
				}
			}

			return ctx.json(invoice);
		}
	);
};
