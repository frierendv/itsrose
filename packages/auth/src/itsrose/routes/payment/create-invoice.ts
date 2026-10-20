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
	calculateInvoiceDates,
	calculateProration,
	createRoute,
	DEFAULT_INVOICE_DUE_DAYS,
	formatProrationDetails,
	INVOICE_TABLE_NAME,
	INVOICE_TYPE,
	isTierDowngrade,
	isTierUpgrade,
	SUBSCRIPTION_STATUS,
	UPGRADE_INVOICE_LIFESPAN_MS,
} from "../../server";
import type {
	InvoiceType,
	ItsRosePluginOptions,
	TransactionInvoice,
} from "../../types";

export const createInvoiceSchema = z.object({
	plan_id: z.string().min(1),
	due_in_days: z.number().int().min(1).max(30).optional(),
	notes: z.string().max(1000).optional(),

	customer: z
		.object({
			name: z.string().optional(),
			email: z.string().email().optional(),
		})
		.optional(),
});

export const createInvoiceEndpoint = (
	client: MidtransClient,
	opts?: ItsRosePluginOptions
) => {
	return createAuthEndpoint(
		createRoute("/payment/create-invoice"),
		{
			method: "POST",
			use: [sessionMiddleware],
			body: createInvoiceSchema,
		},
		async (ctx) => {
			const { session, adapter } = ctx.context;
			const targetPlanId = ctx.body.plan_id.toLowerCase();

			if (targetPlanId === "free") {
				throw new APIError("BAD_REQUEST", {
					message: "The free tier does not require an invoice.",
				});
			}

			// Retrieve target plan from database or seed
			const targetPlan = await getPlanById(ctx, targetPlanId);
			if (!targetPlan) {
				throw new APIError("NOT_FOUND", {
					message: `Plan '${ctx.body.plan_id}' does not exist.`,
				});
			}

			// Check user's current subscription
			const existingSub = await getUserSubscription(ctx, session.user.id);

			const currentTier = existingSub?.plan_id?.toLowerCase() ?? "free";
			const isActive =
				existingSub &&
				(existingSub.status === SUBSCRIPTION_STATUS.ACTIVE ||
					existingSub.status ===
						SUBSCRIPTION_STATUS.PENDING_PAYMENT ||
					existingSub.status === SUBSCRIPTION_STATUS.PAST_DUE);

			if (isActive && currentTier === targetPlanId) {
				throw new APIError("BAD_REQUEST", {
					message: `You are already subscribed to the ${targetPlan.name}.`,
				});
			}

			if (isActive && isTierDowngrade(currentTier, targetPlanId)) {
				throw new APIError("BAD_REQUEST", {
					message: `Target tier '${targetPlan.name}' is a downgrade. Please use the downgrade endpoint to schedule this at cycle end.`,
				});
			}

			const now = new Date();
			let invoiceType: InvoiceType = INVOICE_TYPE.NEW;
			let dueDate: string;
			let payableAmount = targetPlan.price.amount;
			let prorationDetails = null;
			let itemDescription = `${targetPlan.name} (${targetPlan.price.interval})`;

			// Check if this is an upgrade mid-cycle
			if (isActive && isTierUpgrade(currentTier, targetPlanId)) {
				invoiceType = INVOICE_TYPE.UPGRADE;
				const currentPlan = await getPlanById(ctx, currentTier);
				const currentTierPrice = currentPlan?.price?.amount ?? 0;

				const proration = calculateProration({
					currentTier,
					targetTier: targetPlanId,
					currentPeriodStart: existingSub.period_start,
					currentPeriodEnd: existingSub.period_end,
					currentTierPrice,
					targetTierPrice: targetPlan.price.amount,
					now,
				});

				payableAmount = proration.payableAmount;
				prorationDetails = formatProrationDetails(proration);

				// 2-hour lifespan for mid-cycle upgrades
				dueDate = new Date(
					now.getTime() + UPGRADE_INVOICE_LIFESPAN_MS
				).toISOString();

				itemDescription = proration.isCycleReset
					? `${targetPlan.name} (Full Cycle Reset)`
					: `${targetPlan.name} (Prorated Upgrade from ${currentPlan?.name ?? currentTier})`;
			} else {
				// Standard new subscription invoice
				const dueInDays =
					ctx.body.due_in_days ??
					opts?.defaultDueDays ??
					DEFAULT_INVOICE_DUE_DAYS;
				dueDate = calculateInvoiceDates(dueInDays).dueDate;
			}

			const invoiceDate = now.toISOString();
			const orderId = client.merchant.generateOrderId(session.user.id);
			const invoiceNumber = await generateInvoiceNumber(ctx);

			const customerDetails = {
				id: session.user.id,
				name: ctx.body.customer?.name ?? session.user.name,
				email: ctx.body.customer?.email ?? session.user.email,
			};

			const itemDetails = [
				{
					item_id: targetPlan.plan_id,
					description: itemDescription,
					price: payableAmount,
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
					(invoiceType === INVOICE_TYPE.UPGRADE
						? `Mid-cycle upgrade to ${targetPlan.name}.`
						: `Subscription for ${targetPlan.name} (${targetPlan.price.interval})`),
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
						"Failed to create Midtrans invoice.",
				});
			}

			const invoiceData: TransactionInvoice = {
				invoice_id: data.id,
				user_id: session.user.id,
				order_id: orderId,
				invoice_type: invoiceType,
				target_tier: targetPlan.plan_id,
				status: data.status || "pending",
				invoice_date: data.invoice_date || invoiceDate,
				due_date: data.due_date || dueDate,
				invoice_number: invoiceNumber,
				payment_type: data.payment_type || "payment_link",
				pdf_url: data.pdf_url ?? null,
				paid_pdf_url: data.paid_pdf_url ?? null,
				paid_date: data.paid_date ?? null,
				gross_amount: payableAmount,
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

			return ctx.json(result);
		}
	);
};
