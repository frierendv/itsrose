import type { InvoiceRequest, MidtransClient } from "@itsrose/midtrans";
import type { GenericEndpointContext } from "better-auth";
import {
	generateInvoiceNumber,
	getPlanById,
	invalidateUserSubscriptionCache,
} from "../adapter";
import type {
	CronExecutionResult,
	ItsRosePluginOptions,
	Subscription,
	TransactionInvoice,
} from "../types";
import {
	GRACE_PERIOD_MS,
	INVOICE_TABLE_NAME,
	INVOICE_TYPE,
	RENEWAL_DISPATCH_LEAD_MS,
	SUBSCRIPTION_STATUS,
	SUBSCRIPTION_TABLE_NAME,
} from "./constants";

export interface BillingCronOptions {
	now?: Date | string | number;
	leadMs?: number;
	graceMs?: number;
}

/**
 * Scheduled Renewal Invoice Dispatcher:
 * Runs ahead of time (D-3 before current_period_end).
 * If scheduled_tier is present, generates the renewal invoice for that tier.
 * Idempotent: Skips if a pending renewal invoice already exists for the cycle.
 */
export async function dispatchRenewalInvoices(
	ctx: GenericEndpointContext,
	client: MidtransClient,
	opts?: BillingCronOptions
): Promise<{
	dispatched: number;
	errors: Array<{ id: string; error: string }>;
}> {
	const adapter = ctx.context.adapter;
	const now = opts?.now ? new Date(opts.now) : new Date();
	const leadMs = opts?.leadMs ?? RENEWAL_DISPATCH_LEAD_MS;
	const graceMs = opts?.graceMs ?? GRACE_PERIOD_MS;

	const nowMs = now.getTime();
	const renewalWindowThreshold = new Date(nowMs + leadMs);
	const pastGraceThreshold = new Date(nowMs - graceMs);

	// Find active/past-due subscriptions due for renewal
	const candidateSubs = await adapter.findMany<Subscription>({
		model: SUBSCRIPTION_TABLE_NAME,
	});

	let dispatched = 0;
	const errors: Array<{ id: string; error: string }> = [];

	if (!candidateSubs) {
		return { dispatched: 0, errors: [] };
	}

	for (const sub of candidateSubs) {
		try {
			// Skip canceled subscriptions
			if (
				sub.cancel_at_period_end ||
				sub.status === SUBSCRIPTION_STATUS.CANCELED ||
				sub.status === SUBSCRIPTION_STATUS.EXPIRED
			) {
				continue;
			}

			const periodEndMs = new Date(sub.period_end).getTime();

			// Must be within renewal window: now - graceMs < periodEnd <= now + leadMs
			if (
				periodEndMs > renewalWindowThreshold.getTime() ||
				periodEndMs <= pastGraceThreshold.getTime()
			) {
				continue;
			}

			// Determine renewal tier: scheduled_tier takes precedence
			const targetTierId = (
				sub.scheduled_tier || sub.plan_id
			).toLowerCase();

			// If scheduled downgrade is to free, do not generate an invoice
			if (targetTierId === "free") {
				continue;
			}

			// Check if a pending RENEWAL invoice already exists for this user and cycle
			const existingInvoices = await adapter.findMany<TransactionInvoice>(
				{
					model: INVOICE_TABLE_NAME,
					where: [
						{ field: "user_id", value: sub.user_id },
						{ field: "invoice_type", value: INVOICE_TYPE.RENEWAL },
						{ field: "status", value: "pending" },
					],
				}
			);

			if (existingInvoices && existingInvoices.length > 0) {
				// Pending renewal invoice already dispatched
				continue;
			}

			const targetPlan = await getPlanById(ctx, targetTierId);
			if (!targetPlan || targetPlan.price.amount <= 0) {
				continue;
			}

			const orderId = client.merchant.generateOrderId(sub.user_id);
			const invoiceNumber = await generateInvoiceNumber(ctx);

			// Due date is the period_end (or at least 3 days from now)
			const dueDate =
				periodEndMs > nowMs
					? new Date(periodEndMs).toISOString()
					: new Date(nowMs + leadMs).toISOString();
			const invoiceDate = now.toISOString();

			// Fetch user details for customer details
			const userRecord = await adapter.findOne<{
				id: string;
				name?: string;
				email?: string;
			}>({
				model: "user",
				where: [{ field: "id", value: sub.user_id }],
			});

			const customerDetails = {
				id: sub.user_id,
				name: userRecord?.name ?? "Customer",
				email: userRecord?.email ?? "customer@itsrose.rest",
			};

			const itemDetails = [
				{
					item_id: targetPlan.plan_id,
					description: `${targetPlan.name} (Scheduled Renewal)`,
					price: targetPlan.price.amount,
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
				notes: `Renewal invoice for ${targetPlan.name}. Due on ${new Date(dueDate).toLocaleDateString()}`,
				item_details: itemDetails,
			} satisfies InvoiceRequest;

			const { data, error } = await client.invoice.create(
				invoicePayload,
				{
					idempotencyKey: orderId,
				}
			);

			if (error || !data) {
				errors.push({
					id: sub.id,
					error:
						error?.error_messages?.join("; ") ||
						"Failed to create Midtrans renewal invoice.",
				});
				continue;
			}

			const invoiceRecord: TransactionInvoice = {
				invoice_id: data.id,
				user_id: sub.user_id,
				order_id: orderId,
				invoice_type: INVOICE_TYPE.RENEWAL,
				target_tier: targetPlan.plan_id,
				status: data.status || "pending",
				invoice_date: data.invoice_date || invoiceDate,
				due_date: data.due_date || dueDate,
				invoice_number: invoiceNumber,
				payment_type: data.payment_type || "payment_link",
				pdf_url: data.pdf_url ?? null,
				paid_pdf_url: data.paid_pdf_url ?? null,
				paid_date: data.paid_date ?? null,
				gross_amount: targetPlan.price.amount,
				payment_link_url: data.payment_link_url ?? null,
				customer_details: customerDetails,
				item_details: itemDetails,
			};

			await adapter.create<TransactionInvoice>({
				model: INVOICE_TABLE_NAME,
				data: invoiceRecord,
			});

			dispatched++;
		} catch (err) {
			errors.push({
				id: sub.id,
				error: (err as Error).message || String(err),
			});
		}
	}

	return { dispatched, errors };
}

/**
 * Grace Period Tracker:
 * Identifies subscriptions whose period_end has passed without payment settlement.
 * Transitions active subscriptions to PAST_DUE and sets grace_period_end.
 */
export async function trackGracePeriods(
	ctx: GenericEndpointContext,
	opts?: BillingCronOptions
): Promise<{ tracked: number; errors: Array<{ id: string; error: string }> }> {
	const adapter = ctx.context.adapter;
	const now = opts?.now ? new Date(opts.now) : new Date();
	const graceMs = opts?.graceMs ?? GRACE_PERIOD_MS;
	const nowMs = now.getTime();

	const candidateSubs = await adapter.findMany<Subscription>({
		model: SUBSCRIPTION_TABLE_NAME,
		where: [{ field: "status", value: SUBSCRIPTION_STATUS.ACTIVE }],
	});

	let tracked = 0;
	const errors: Array<{ id: string; error: string }> = [];

	if (!candidateSubs) {
		return { tracked: 0, errors: [] };
	}

	for (const sub of candidateSubs) {
		try {
			const periodEndMs = new Date(sub.period_end).getTime();

			// If current period has ended but still within grace period window
			if (periodEndMs <= nowMs && nowMs < periodEndMs + graceMs) {
				const gracePeriodEnd = new Date(periodEndMs + graceMs);

				await adapter.update({
					model: SUBSCRIPTION_TABLE_NAME,
					where: [{ field: "id", value: sub.id }],
					update: {
						status: SUBSCRIPTION_STATUS.PAST_DUE,
						grace_period_end: gracePeriodEnd,
					},
				});

				await invalidateUserSubscriptionCache(ctx, sub.user_id);
				tracked++;
			}
		} catch (err) {
			errors.push({
				id: sub.id,
				error: (err as Error).message || String(err),
			});
		}
	}

	return { tracked, errors };
}

/**
 * Past-Due and Expiry Sweeper:
 * Scans subscriptions where grace period has expired without settlement.
 * Transitions to EXPIRED and resets access tier to free.
 * Optionally voids pending unpaid renewal invoices.
 */
export async function sweepPastDueAndExpired(
	ctx: GenericEndpointContext,
	client?: MidtransClient,
	opts?: BillingCronOptions
): Promise<{ swept: number; errors: Array<{ id: string; error: string }> }> {
	const adapter = ctx.context.adapter;
	const now = opts?.now ? new Date(opts.now) : new Date();
	const graceMs = opts?.graceMs ?? GRACE_PERIOD_MS;
	const nowMs = now.getTime();

	const candidateSubs = await adapter.findMany<Subscription>({
		model: SUBSCRIPTION_TABLE_NAME,
	});

	let swept = 0;
	const errors: Array<{ id: string; error: string }> = [];

	if (!candidateSubs) {
		return { swept: 0, errors: [] };
	}

	for (const sub of candidateSubs) {
		try {
			// Skip if already in terminal state
			if (
				sub.status === SUBSCRIPTION_STATUS.EXPIRED ||
				sub.status === SUBSCRIPTION_STATUS.CANCELED
			) {
				continue;
			}

			const periodEndMs = new Date(sub.period_end).getTime();
			const graceLimitMs = sub.grace_period_end
				? new Date(sub.grace_period_end).getTime()
				: periodEndMs + graceMs;

			// If now is strictly past the grace period
			if (nowMs >= graceLimitMs) {
				await adapter.update({
					model: SUBSCRIPTION_TABLE_NAME,
					where: [{ field: "id", value: sub.id }],
					update: {
						status: SUBSCRIPTION_STATUS.EXPIRED,
						plan_id: "free",
						scheduled_tier: null,
						grace_period_end: null,
						ended_at: now,
					},
				});

				// Void pending unpaid renewal invoices for this user
				if (client) {
					const pendingInvoices =
						await adapter.findMany<TransactionInvoice>({
							model: INVOICE_TABLE_NAME,
							where: [
								{ field: "user_id", value: sub.user_id },
								{ field: "status", value: "pending" },
							],
						});

					if (pendingInvoices) {
						for (const inv of pendingInvoices) {
							try {
								await client.invoice.void(inv.invoice_id);
								await adapter.update({
									model: INVOICE_TABLE_NAME,
									where: [
										{
											field: "invoice_id",
											value: inv.invoice_id,
										},
									],
									update: { status: "void" },
								});
							} catch {
								// Best effort voiding
							}
						}
					}
				}

				await invalidateUserSubscriptionCache(ctx, sub.user_id);
				swept++;
			}
		} catch (err) {
			errors.push({
				id: sub.id,
				error: (err as Error).message || String(err),
			});
		}
	}

	return { swept, errors };
}

/**
 * Runs all billing recurring engine cron tasks sequentially.
 */
export async function runAllBillingCronTasks(
	ctx: GenericEndpointContext,
	client: MidtransClient,
	opts?: BillingCronOptions & { pluginOpts?: ItsRosePluginOptions }
): Promise<CronExecutionResult> {
	const allErrors: Array<{ task: string; id?: string; error: string }> = [];

	const renewalsResult = await dispatchRenewalInvoices(ctx, client, opts);
	for (const e of renewalsResult.errors) {
		allErrors.push({ task: "dispatchRenewalInvoices", ...e });
	}

	const graceResult = await trackGracePeriods(ctx, opts);
	for (const e of graceResult.errors) {
		allErrors.push({ task: "trackGracePeriods", ...e });
	}

	const sweeperResult = await sweepPastDueAndExpired(ctx, client, opts);
	for (const e of sweeperResult.errors) {
		allErrors.push({ task: "sweepPastDueAndExpired", ...e });
	}

	return {
		dispatched_renewals: renewalsResult.dispatched,
		tracked_grace_periods: graceResult.tracked,
		swept_expired: sweeperResult.swept,
		errors: allErrors,
	};
}
