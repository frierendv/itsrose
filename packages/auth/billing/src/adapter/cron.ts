import type { MidtransClient } from "@itsrose/midtrans";
import type { GenericEndpointContext } from "better-auth";
import { INVOICE_TYPE, SUBSCRIPTION_STATUS } from "../domain/constants";
import {
	buildExpiryUpdate,
	buildGraceUpdate,
	buildRenewalInvoiceDates,
	isGraceTrackingCandidate,
	isRenewalCandidate,
	isSweepCandidate,
	resolveCronWindow,
	resolveRenewalTier,
	type BillingCronOptions,
} from "../domain/cron.service";
import {
	buildInvoiceRecord,
	type MidtransInvoiceResult,
} from "../domain/invoice.service";
import type { CronExecutionResult, ItsRosePluginOptions } from "../types";
import { getPlanById } from "./plan";
import { createBillingRepositories } from "./repository";

/**
 * Scheduled Renewal Invoice Dispatcher:
 * Runs ahead of time (D-3 before current_period_end).
 * If `scheduled_tier` is present, generates the renewal invoice for that tier.
 * Idempotent: skips when a pending renewal invoice already exists for the
 * cycle.
 */
export async function dispatchRenewalInvoices(
	ctx: GenericEndpointContext,
	client: MidtransClient,
	opts?: BillingCronOptions
): Promise<{
	dispatched: number;
	errors: Array<{ id: string; error: string }>;
}> {
	const window = resolveCronWindow(opts);
	const repositories = createBillingRepositories(ctx);
	const subscriptions = await repositories.subscriptions.findAll();

	let dispatched = 0;
	const errors: Array<{ id: string; error: string }> = [];

	for (const subscription of subscriptions) {
		try {
			if (!isRenewalCandidate(subscription, window)) {
				continue;
			}

			const targetTierId = resolveRenewalTier(subscription);

			// A scheduled downgrade to free needs no invoice.
			if (targetTierId === "free") {
				continue;
			}

			const pendingInvoices =
				await repositories.invoices.findPendingRenewal(
					subscription.user_id
				);
			if (pendingInvoices.length > 0) {
				continue;
			}

			const targetPlan = await getPlanById(ctx, targetTierId);
			if (!targetPlan || targetPlan.price.amount <= 0) {
				continue;
			}

			const orderId = client.merchant.generateOrderId(
				subscription.user_id
			);
			const invoiceNumber = await repositories.sequences.next();
			const { invoiceDate, dueDate } = buildRenewalInvoiceDates(
				subscription,
				window
			);

			const customer = await repositories.users.findContact(
				subscription.user_id
			);
			const customerDetails = {
				id: subscription.user_id,
				name: customer?.name ?? "Customer",
				email: customer?.email ?? "customer@itsrose.rest",
			};
			const itemDetails = [
				{
					item_id: targetPlan.plan_id,
					description: `${targetPlan.name} (Scheduled Renewal)`,
					price: targetPlan.price.amount,
					quantity: 1,
				},
			];

			const { data, error } = await client.invoice.create(
				{
					order_id: orderId,
					invoice_number: invoiceNumber,
					payment_type: "payment_link",
					invoice_date: invoiceDate,
					due_date: dueDate,
					customer_details: customerDetails,
					notes: `Renewal invoice for ${targetPlan.name}. Due on ${new Date(dueDate).toLocaleDateString()}`,
					item_details: itemDetails,
				},
				{ idempotencyKey: orderId }
			);

			if (error || !data) {
				errors.push({
					id: subscription.id,
					error:
						error?.error_messages?.join("; ") ||
						"Failed to create Midtrans renewal invoice.",
				});
				continue;
			}

			const invoiceRecord = buildInvoiceRecord({
				midtrans: data as MidtransInvoiceResult,
				userId: subscription.user_id,
				orderId,
				invoiceType: INVOICE_TYPE.RENEWAL,
				targetTier: targetPlan.plan_id,
				invoiceNumber,
				invoiceDate,
				dueDate,
				grossAmount: targetPlan.price.amount,
				customerDetails,
				itemDetails,
			});

			await repositories.invoices.create(invoiceRecord);
			dispatched++;
		} catch (error) {
			errors.push({
				id: subscription.id,
				error: (error as Error).message || String(error),
			});
		}
	}

	return { dispatched, errors };
}

/**
 * Grace Period Tracker:
 * Transitions active subscriptions whose paid period elapsed into PAST_DUE and
 * records the grace window end.
 */
export async function trackGracePeriods(
	ctx: GenericEndpointContext,
	opts?: BillingCronOptions
): Promise<{ tracked: number; errors: Array<{ id: string; error: string }> }> {
	const window = resolveCronWindow(opts);
	const repositories = createBillingRepositories(ctx);
	const subscriptions = await repositories.subscriptions.findManyByStatus(
		SUBSCRIPTION_STATUS.ACTIVE
	);

	let tracked = 0;
	const errors: Array<{ id: string; error: string }> = [];

	for (const subscription of subscriptions) {
		try {
			if (!isGraceTrackingCandidate(subscription, window)) {
				continue;
			}

			await repositories.subscriptions.update(
				subscription.id,
				buildGraceUpdate(subscription, window)
			);
			tracked++;
		} catch (error) {
			errors.push({
				id: subscription.id,
				error: (error as Error).message || String(error),
			});
		}
	}

	return { tracked, errors };
}

/**
 * Past-Due and Expiry Sweeper:
 * Expires subscriptions past their grace window, resets the tier to free and
 * voids pending unpaid invoices.
 */
export async function sweepPastDueAndExpired(
	ctx: GenericEndpointContext,
	client?: MidtransClient,
	opts?: BillingCronOptions
): Promise<{ swept: number; errors: Array<{ id: string; error: string }> }> {
	const window = resolveCronWindow(opts);
	const repositories = createBillingRepositories(ctx);
	const subscriptions = await repositories.subscriptions.findAll();

	let swept = 0;
	const errors: Array<{ id: string; error: string }> = [];

	for (const subscription of subscriptions) {
		try {
			if (!isSweepCandidate(subscription, window)) {
				continue;
			}

			await repositories.subscriptions.update(
				subscription.id,
				buildExpiryUpdate(window)
			);

			if (client) {
				const pendingInvoices =
					await repositories.invoices.findPendingByUser(
						subscription.user_id
					);

				for (const invoice of pendingInvoices) {
					try {
						await client.invoice.void(invoice.invoice_id);
						await repositories.invoices.update(invoice.invoice_id, {
							status: "void",
						});
					} catch {
						// Best-effort voiding.
					}
				}
			}

			swept++;
		} catch (error) {
			errors.push({
				id: subscription.id,
				error: (error as Error).message || String(error),
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
	for (const error of renewalsResult.errors) {
		allErrors.push({ task: "dispatchRenewalInvoices", ...error });
	}

	const graceResult = await trackGracePeriods(ctx, opts);
	for (const error of graceResult.errors) {
		allErrors.push({ task: "trackGracePeriods", ...error });
	}

	const sweeperResult = await sweepPastDueAndExpired(ctx, client, opts);
	for (const error of sweeperResult.errors) {
		allErrors.push({ task: "sweepPastDueAndExpired", ...error });
	}

	return {
		dispatched_renewals: renewalsResult.dispatched,
		tracked_grace_periods: graceResult.tracked,
		swept_expired: sweeperResult.swept,
		errors: allErrors,
	};
}
