import type { InvoiceRequest, MidtransClient } from "@itsrose/midtrans";
import {
	APIError,
	createAuthEndpoint,
	sessionMiddleware,
} from "better-auth/api";
import { z } from "zod/v4";
import {
	generateInvoiceNumber,
	getPlanById,
	getUserSubscription,
} from "../../adapter";
import {
	calculateProration,
	createRoute,
	formatProrationDetails,
	INVOICE_TABLE_NAME,
	INVOICE_TYPE,
	isTierDowngrade,
	UPGRADE_INVOICE_LIFESPAN_MS,
} from "../../server";
import type { ItsRosePluginOptions, TransactionInvoice } from "../../types";

export const upgradeSubscriptionSchema = z.object({
	target_tier: z.string().min(1),
	notes: z.string().max(1000).optional(),
	customer: z
		.object({
			name: z.string().optional(),
			email: z.string().email().optional(),
		})
		.optional(),
});

export const upgradeSubscriptionEndpoint = (
	client: MidtransClient,
	opts?: ItsRosePluginOptions
) => {
	return createAuthEndpoint(
		createRoute("/subscription/upgrade"),
		{
			method: "POST",
			use: [sessionMiddleware],
			body: upgradeSubscriptionSchema,
		},
		async (ctx) => {
			const { session, adapter } = ctx.context;
			const targetPlanId = ctx.body.target_tier.toLowerCase();

			if (targetPlanId === "free") {
				throw new APIError("BAD_REQUEST", {
					message:
						"Cannot upgrade to the free tier. Use the downgrade or cancel endpoint instead.",
				});
			}

			const targetPlan = await getPlanById(ctx, targetPlanId);
			if (!targetPlan) {
				throw new APIError("NOT_FOUND", {
					message: `Target plan '${ctx.body.target_tier}' does not exist.`,
				});
			}

			const existingSub = await getUserSubscription(ctx, session.user.id);

			const currentTier = existingSub?.plan_id ?? "free";

			if (currentTier.toLowerCase() === targetPlanId) {
				throw new APIError("BAD_REQUEST", {
					message: `You are already subscribed to the ${targetPlan.name}.`,
				});
			}

			if (isTierDowngrade(currentTier, targetPlanId)) {
				throw new APIError("BAD_REQUEST", {
					message: `Target tier '${targetPlan.name}' is a downgrade. Please use the downgrade endpoint to schedule this at cycle end.`,
				});
			}

			const currentPlan = await getPlanById(ctx, currentTier);
			const currentTierPrice = currentPlan?.price?.amount ?? 0;
			const targetTierPrice = targetPlan.price.amount;

			const now = new Date();
			const periodStart = existingSub?.period_start ?? now;
			const periodEnd = existingSub?.period_end ?? now;

			// Compute mathematical proration
			const proration = calculateProration({
				currentTier,
				targetTier: targetPlanId,
				currentPeriodStart: periodStart,
				currentPeriodEnd: periodEnd,
				currentTierPrice,
				targetTierPrice,
				now,
			});

			// Short lifespan for mid-cycle upgrade invoices: 2 hours
			const dueDate = new Date(
				now.getTime() + UPGRADE_INVOICE_LIFESPAN_MS
			).toISOString();
			const invoiceDate = now.toISOString();

			const orderId = client.merchant.generateOrderId(session.user.id);
			const invoiceNumber = await generateInvoiceNumber(ctx);

			const customerDetails = {
				id: session.user.id,
				name: ctx.body.customer?.name ?? session.user.name,
				email: ctx.body.customer?.email ?? session.user.email,
			};

			const itemDescription = proration.isCycleReset
				? `${targetPlan.name} (Full Cycle Reset)`
				: `${targetPlan.name} (Prorated Upgrade from ${currentPlan?.name ?? currentTier})`;

			const itemDetails = [
				{
					item_id: targetPlan.plan_id,
					description: itemDescription,
					price: proration.payableAmount,
					quantity: 1,
				},
			];

			const invoicePayload = {
				order_id: orderId,
				invoice_number: invoiceNumber,
				payment_type: "payment_link",
				invoice_date: invoiceDate,
				due_date: dueDate,
				customer_details: customerDetails,
				notes:
					ctx.body.notes ||
					`Mid-cycle upgrade to ${targetPlan.name}. Prorated payable: IDR ${proration.payableAmount.toLocaleString()}`,
				item_details: itemDetails,
			} satisfies InvoiceRequest;

			const { data, error } = await client.invoice.create(
				invoicePayload,
				{
					idempotencyKey: orderId,
				}
			);

			if (error || !data) {
				throw new APIError("CONFLICT", {
					message:
						error?.error_messages?.join("; ") ||
						"Failed to create Midtrans upgrade invoice.",
				});
			}

			const prorationDetails = formatProrationDetails(proration);

			const invoiceData: TransactionInvoice = {
				invoice_id: data.id,
				user_id: session.user.id,
				order_id: orderId,
				invoice_type: INVOICE_TYPE.UPGRADE,
				target_tier: targetPlan.plan_id,
				status: data.status || "pending",
				invoice_date: data.invoice_date || invoiceDate,
				due_date: data.due_date || dueDate,
				invoice_number: invoiceNumber,
				payment_type: data.payment_type || "payment_link",
				pdf_url: data.pdf_url ?? null,
				paid_pdf_url: data.paid_pdf_url ?? null,
				paid_date: data.paid_date ?? null,
				gross_amount: proration.payableAmount,
				payment_link_url: data.payment_link_url ?? null,
				customer_details: customerDetails,
				item_details: itemDetails,
				proration_details: prorationDetails,
			};

			const stored = await adapter.create<TransactionInvoice>({
				model: INVOICE_TABLE_NAME,
				data: invoiceData,
			});

			const result = stored || invoiceData;
			await opts?.onInvoiceCreated?.(result, ctx);

			return ctx.json({
				invoice: result,
				proration: prorationDetails,
			});
		}
	);
};
