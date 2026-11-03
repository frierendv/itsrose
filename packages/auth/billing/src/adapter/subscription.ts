import type { GenericEndpointContext } from "better-auth";
import {
	buildAdminSubscriptionUpdate,
	buildCancellationUpdate,
	buildFreeUserSubscription,
	buildNewSubscriptionSettlement,
	buildRenewalSettlement,
	buildRestoreUpdate,
	buildSubscriptionUpsertPayload,
	buildUpgradeSettlement,
	buildUserSubscription,
	type AdminSubscriptionUpdateInput,
	type SubscriptionUpsertInput,
} from "../domain/subscription.service";
import type {
	Subscription,
	TransactionInvoice,
	UserSubscription,
} from "../types";
import { getPlanById } from "./plan";
import { createBillingRepositories } from "./repository";

/**
 * Returns the user's authoritative subscription from cache or database.
 */
export async function getUserSubscription(
	ctx: GenericEndpointContext,
	userId: string
): Promise<Subscription | null> {
	return createBillingRepositories(ctx).subscriptions.findCurrentByUser(
		userId
	);
}

export async function invalidateUserSubscriptionCache(
	ctx: GenericEndpointContext,
	userId: string
): Promise<void> {
	await createBillingRepositories(ctx).subscriptions.invalidateCache(userId);
}

export async function getSubscriptionById(
	ctx: GenericEndpointContext,
	subscriptionId: string
): Promise<Subscription | null> {
	return createBillingRepositories(ctx).subscriptions.findById(
		subscriptionId
	);
}

/**
 * Creates or updates the user's base subscription record.
 */
export async function createOrUpdateSubscription(
	ctx: GenericEndpointContext,
	data: SubscriptionUpsertInput
): Promise<Subscription> {
	const repositories = createBillingRepositories(ctx);
	const existing = await repositories.subscriptions.findCurrentByUser(
		data.user_id
	);
	const payload = buildSubscriptionUpsertPayload(data);

	let result: Subscription;

	if (existing) {
		const updated = await repositories.subscriptions.update(
			existing.id,
			payload as Partial<Subscription>
		);
		result = updated ?? ({ ...existing, ...payload } as Subscription);
	} else {
		result = await repositories.subscriptions.create(payload);
	}

	await repositories.subscriptions.invalidateCache(data.user_id);
	return result;
}

/**
 * Schedules a downgrade for the subscription to be executed at the next
 * renewal cycle. Does NOT change the active tier or generate invoices.
 */
export async function scheduleDowngrade(
	ctx: GenericEndpointContext,
	userId: string,
	targetTier: string
): Promise<Subscription | null> {
	const repositories = createBillingRepositories(ctx);
	const subscription =
		await repositories.subscriptions.findCurrentByUser(userId);
	if (!subscription) {
		return null;
	}

	const updated = await repositories.subscriptions.update(subscription.id, {
		scheduled_tier: targetTier,
	});

	return updated ?? { ...subscription, scheduled_tier: targetTier };
}

/**
 * Cancels a pending scheduled downgrade, reverting scheduled_tier to null.
 */
export async function cancelScheduledDowngrade(
	ctx: GenericEndpointContext,
	userId: string
): Promise<Subscription | null> {
	const repositories = createBillingRepositories(ctx);
	const subscription =
		await repositories.subscriptions.findCurrentByUser(userId);
	if (!subscription) {
		return null;
	}

	const updated = await repositories.subscriptions.update(subscription.id, {
		scheduled_tier: null,
	});

	return updated ?? { ...subscription, scheduled_tier: null };
}

async function applySettlement(
	ctx: GenericEndpointContext,
	invoice: TransactionInvoice,
	buildPayload: (
		existing: Subscription | null,
		invoice: TransactionInvoice
	) => Partial<Subscription>
): Promise<Subscription> {
	const repositories = createBillingRepositories(ctx);
	const existing = await repositories.subscriptions.findCurrentByUser(
		invoice.user_id
	);
	const payload = buildPayload(existing, invoice);

	let result: Subscription;

	if (existing) {
		const updated = await repositories.subscriptions.update(
			existing.id,
			payload
		);
		result = updated ?? ({ ...existing, ...payload } as Subscription);
	} else {
		result = await repositories.subscriptions.create({
			user_id: invoice.user_id,
			...payload,
		});
	}

	await repositories.subscriptions.invalidateCache(invoice.user_id);
	return result;
}

/**
 * Applies mid-cycle upgrade payment settlement.
 */
export async function applyUpgradeSettlement(
	ctx: GenericEndpointContext,
	invoice: TransactionInvoice
): Promise<Subscription> {
	return applySettlement(ctx, invoice, buildUpgradeSettlement);
}

/**
 * Applies renewal payment settlement.
 */
export async function applyRenewalSettlement(
	ctx: GenericEndpointContext,
	invoice: TransactionInvoice
): Promise<Subscription> {
	return applySettlement(ctx, invoice, buildRenewalSettlement);
}

/**
 * Applies new subscription payment settlement.
 */
export async function applyNewSubscriptionSettlement(
	ctx: GenericEndpointContext,
	invoice: TransactionInvoice
): Promise<Subscription> {
	return applySettlement(ctx, invoice, (_existing, currentInvoice) =>
		buildNewSubscriptionSettlement(currentInvoice)
	);
}

/**
 * Cancels a subscription — either gracefully at period end or immediately.
 */
export async function cancelSubscription(
	ctx: GenericEndpointContext,
	opts: {
		userId: string;
		subscriptionId?: string;
		cancelAtPeriodEnd?: boolean;
	}
): Promise<Subscription | null> {
	const repositories = createBillingRepositories(ctx);

	const subscription = opts.subscriptionId
		? await repositories.subscriptions.findById(opts.subscriptionId)
		: await repositories.subscriptions.findCurrentByUser(opts.userId);

	if (!subscription) {
		return null;
	}

	const updatePayload = buildCancellationUpdate(
		new Date(),
		opts.cancelAtPeriodEnd ?? true
	);

	const updated = await repositories.subscriptions.update(
		subscription.id,
		updatePayload
	);

	return updated ?? { ...subscription, ...updatePayload };
}

/**
 * Restores a subscription that was canceled at period end.
 */
export async function restoreSubscription(
	ctx: GenericEndpointContext,
	opts: {
		userId: string;
		subscriptionId?: string;
	}
): Promise<boolean> {
	const repositories = createBillingRepositories(ctx);

	const subscription = opts.subscriptionId
		? await repositories.subscriptions.findById(opts.subscriptionId)
		: await repositories.subscriptions.findCurrentByUser(opts.userId);

	if (!subscription || !subscription.cancel_at_period_end) {
		return false;
	}

	await repositories.subscriptions.update(
		subscription.id,
		buildRestoreUpdate()
	);

	return true;
}

/**
 * Resolves the user's full subscription state and feature access.
 */
export async function resolveUserSubscription(
	ctx: GenericEndpointContext,
	userId: string
): Promise<UserSubscription> {
	const subscription = await getUserSubscription(ctx, userId);

	if (!subscription) {
		return buildFreeUserSubscription();
	}

	const plan = await getPlanById(ctx, subscription.plan_id);
	return buildUserSubscription(subscription, plan);
}

/**
 * Admin override used by `POST /subscription/update`.
 */
export async function updateSubscriptionRecord(
	ctx: GenericEndpointContext,
	input: AdminSubscriptionUpdateInput & {
		subscriptionId?: string;
		userId?: string;
	}
): Promise<Subscription | null> {
	const repositories = createBillingRepositories(ctx);

	const existing = input.subscriptionId
		? await repositories.subscriptions.findById(input.subscriptionId)
		: input.userId
			? await repositories.subscriptions.findCurrentByUser(input.userId)
			: null;

	if (!existing) {
		return null;
	}

	const updatePayload = buildAdminSubscriptionUpdate(input);
	return (
		(await repositories.subscriptions.update(
			existing.id,
			updatePayload
		)) ?? {
			...existing,
			...updatePayload,
		}
	);
}
