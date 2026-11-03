import { InvoiceWebhookSchema, type MidtransClient } from "@itsrose/midtrans";
import type { GenericEndpointContext } from "better-auth";
import { APIError, createAuthEndpoint } from "better-auth/api";
import {
	applyNewSubscriptionSettlement,
	applyRenewalSettlement,
	applyUpgradeSettlement,
	findInvoiceById,
	findInvoiceByOrderId,
	getUserSubscription,
} from "../../adapter";
import {
	createRoute,
	INVOICE_EVENT_TABLE_NAME,
	INVOICE_TABLE_NAME,
	INVOICE_TYPE,
} from "../../server";
import type { ItsRosePluginOptions, TransactionInvoice } from "../../types";

export const webhookEndpoint = (
	client: MidtransClient,
	opts?: ItsRosePluginOptions
) => {
	return createAuthEndpoint(
		createRoute("/payment/webhook"),
		{
			method: "POST",
			disableBody: true,
			requireRequest: true,
		},
		async (ctx: GenericEndpointContext) => {
			if (!ctx.request) {
				throw new APIError("BAD_REQUEST", {
					message: "Invalid request payload.",
				});
			}

			const json = await ctx.request.json().catch(() => ({}));

			// 1. Verify SHA-512 notification signature constant-time
			if (!client.merchant.verifySignature(json)) {
				throw new APIError("FORBIDDEN", {
					message: "Transaction signature verification failed.",
				});
			}

			const parsed = InvoiceWebhookSchema.safeParse(json);
			let invoiceId = parsed.success
				? parsed.data.metadata?.midtrans_invoice_id
				: undefined;

			// Resolve invoice_id from order_id if not present in metadata
			if (!invoiceId && typeof json.order_id === "string") {
				const existing = await findInvoiceByOrderId(ctx, json.order_id);
				if (existing) {
					invoiceId = existing.invoice_id;
				}
			}

			if (!invoiceId) {
				// Record unresolvable event and return early
				await ctx.context.adapter.create({
					model: INVOICE_EVENT_TABLE_NAME,
					data: {
						event_name: "midtrans.webhook.unresolvable_invoice",
						created_at: new Date(),
						event_json: json,
					},
				});
				return ctx.json({ ok: true, status: "logged" });
			}

			// 2. Fetch existing invoice from local database for idempotency check
			const existingInvoice = await findInvoiceById(ctx, invoiceId);
			if (!existingInvoice) {
				await ctx.context.adapter.create({
					model: INVOICE_EVENT_TABLE_NAME,
					data: {
						event_name: "midtrans.webhook.invoice_not_found",
						created_at: new Date(),
						event_json: { invoice_id: invoiceId, ...json },
					},
				});
				return ctx.json({ ok: true, status: "invoice_not_found" });
			}

			// 3. Webhook Idempotency:
			// If already marked 'paid', do not re-apply subscription tier or re-advance cycle anchor!
			if (existingInvoice.status === "paid") {
				await ctx.context.adapter.create({
					model: INVOICE_EVENT_TABLE_NAME,
					data: {
						event_name: "midtrans.webhook.duplicate_ignored",
						created_at: new Date(),
						event_json: {
							invoice_id: invoiceId,
							status: "already_paid",
							order_id: existingInvoice.order_id,
						},
					},
				});
				return ctx.json({
					ok: true,
					status: "idempotent_skip",
					invoice_id: invoiceId,
				});
			}

			// 4. Query authoritative status & assets from Midtrans Invoice API
			const { data: remoteData } = await client.invoice.get(invoiceId);

			const finalStatus =
				remoteData?.status || json.transaction_status || "pending";
			const paidDate =
				remoteData?.paid_date ||
				(finalStatus === "paid" ? new Date().toISOString() : null);

			// 5. Wrap state transitions in an atomic transaction if supported
			const adapter = ctx.context.adapter;

			const executeTransition = async (trxAdapter: any) => {
				// Update invoice record
				await trxAdapter.update({
					model: INVOICE_TABLE_NAME,
					where: [{ field: "invoice_id", value: invoiceId }],
					update: {
						status: finalStatus,
						pdf_url: remoteData?.pdf_url ?? existingInvoice.pdf_url,
						paid_pdf_url:
							remoteData?.paid_pdf_url ??
							existingInvoice.paid_pdf_url,
						paid_date: paidDate ?? existingInvoice.paid_date,
						payment_type:
							remoteData?.payment_type ??
							existingInvoice.payment_type,
					},
				});

				// Record audit event
				await trxAdapter.create({
					model: INVOICE_EVENT_TABLE_NAME,
					data: {
						event_name: `midtrans.invoice.${finalStatus}`,
						created_at: new Date(),
						event_json: {
							invoice_id: invoiceId,
							order_id: existingInvoice.order_id,
							final_status: finalStatus,
							payload: json,
						},
					},
				});

				// Apply subscription state transition upon confirmed payment
				if (finalStatus === "paid") {
					const updatedInvoice: TransactionInvoice = {
						...existingInvoice,
						status: "paid",
						paid_date: paidDate ?? new Date().toISOString(),
					};

					const priorSub = await getUserSubscription(
						ctx,
						existingInvoice.user_id
					);

					let updatedSub;

					switch (existingInvoice.invoice_type) {
						case INVOICE_TYPE.UPGRADE: {
							// Mid-cycle upgrade: apply higher tier immediately, keep cycle anchor intact
							updatedSub = await applyUpgradeSettlement(
								ctx,
								updatedInvoice
							);
							break;
						}
						case INVOICE_TYPE.RENEWAL: {
							// Scheduled renewal: apply renewed/scheduled tier, advance anchor by 30 days
							updatedSub = await applyRenewalSettlement(
								ctx,
								updatedInvoice
							);
							break;
						}
						case INVOICE_TYPE.NEW:
						default: {
							// New subscription: start 30-day period from paid date
							updatedSub = await applyNewSubscriptionSettlement(
								ctx,
								updatedInvoice
							);
							break;
						}
					}

					if (priorSub) {
						await opts?.onSubscriptionUpdated?.(updatedSub, ctx);
					} else {
						await opts?.onSubscriptionCreated?.(updatedSub, ctx);
					}

					await opts?.onInvoicePaid?.(updatedInvoice, ctx);
				}
			};

			if (typeof adapter.transaction === "function") {
				await adapter.transaction(executeTransition);
			} else {
				await executeTransition(adapter);
			}

			return ctx.json({
				ok: true,
				status: finalStatus,
				invoice_id: invoiceId,
			});
		}
	);
};
