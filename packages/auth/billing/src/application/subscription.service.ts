import type { BillingRepositories, ClockPort } from "../domain/ports";
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
import { getPlanById } from "./plan.service";

/**
 * Returns the user's authoritative subscription from cache or database.
 */
export async function getUserSubscription(
	repositories: Pick<
		BillingRepositories["subscriptions"],
		"findCurrentByUser"
	>,
	userId: string
): Promise<Subscription | null> {
	return repositories.findCurrentByUser(userId);
}

export async function getSubscriptionById(
	repositories: Pick<BillingRepositories["subscriptions"], "findById">,
	subscriptionId: string
): Promise<Subscription | null> {
	return repositories.findById(subscriptionId);
}

export async function invalidateUserSubscriptionCache(
	repositories: Pick<BillingRepositories["subscriptions"], "invalidateCache">,
	userId: string
): Promise<void> {
	await repositories.invalidateCache(userId);
}

/**
 * Creates or updates the user's base subscription record.
 */
export async function createOrUpdateSubscription(
	repositories: Pick<
		BillingRepositories["subscriptions"],
		"findCurrentByUser" | "update" | "create" | "invalidateCache"
	>,
	data: SubscriptionUpsertInput
): Promise<Subscription> {
	const existing = await repositories.findCurrentByUser(data.user_id);
	const payload = buildSubscriptionUpsertPayload(data);

	let result: Subscription;

	if (existing) {
		const updated = await repositories.update(
			existing.id,
			payload as Partial<Subscription>
		);
		result = updated ?? ({ ...existing, ...payload } as Subscription);
	} else {
		result = await repositories.create(payload);
	}

	await repositories.invalidateCache(data.user_id);
	return result;
}

/**
 * Schedules a downgrade for the subscription to be executed at the next
 * renewal cycle. Does NOT change the active tier or generate invoices.
 */
export async function scheduleDowngrade(
	repositories: Pick<
		BillingRepositories["subscriptions"],
		"findCurrentByUser" | "update"
	>,
	userId: string,
	targetTier: string
): Promise<Subscription | null> {
	const subscription = await repositories.findCurrentByUser(userId);
	if (!subscription) {
		return null;
	}

	const updated = await repositories.update(subscription.id, {
		scheduled_tier: targetTier,
	});

	return updated ?? { ...subscription, scheduled_tier: targetTier };
}

/**
 * Cancels a pending scheduled downgrade, reverting scheduled_tier to null.
 */
export async function cancelScheduledDowngrade(
	repositories: Pick<
		BillingRepositories["subscriptions"],
		"findCurrentByUser" | "update"
	>,
	userId: string
): Promise<Subscription | null> {
	const subscription = await repositories.findCurrentByUser(userId);
	if (!subscription) {
		return null;
	}

	const updated = await repositories.update(subscription.id, {
		scheduled_tier: null,
	});

	return updated ?? { ...subscription, scheduled_tier: null };
}

async function applySettlement(
	repositories: Pick<
		BillingRepositories["subscriptions"],
		"findCurrentByUser" | "update" | "create" | "invalidateCache"
	>,
	clock: ClockPort,
	invoice: TransactionInvoice,
	buildPayload: (
		existing: Subscription | null,
		invoice: TransactionInvoice,
		now: Date
	) => Partial<Subscription>
): Promise<Subscription> {
	const existing = await repositories.findCurrentByUser(invoice.user_id);
	const payload = buildPayload(existing, invoice, clock.now());

	let result: Subscription;

	if (existing) {
		const updated = await repositories.update(existing.id, payload);
		result = updated ?? ({ ...existing, ...payload } as Subscription);
	} else {
		result = await repositories.create({
			user_id: invoice.user_id,
			...payload,
		});
	}

	await repositories.invalidateCache(invoice.user_id);
	return result;
}

/**
 * Applies mid-cycle upgrade payment settlement.
 */
export async function applyUpgradeSettlement(
	repositories: Pick<
		BillingRepositories["subscriptions"],
		"findCurrentByUser" | "update" | "create" | "invalidateCache"
	>,
	clock: ClockPort,
	invoice: TransactionInvoice
): Promise<Subscription> {
	return applySettlement(
		repositories,
		clock,
		invoice,
		(existing, currentInvoice, now) =>
			buildUpgradeSettlement(existing, currentInvoice, now)
	);
}

/**
 * Applies renewal payment settlement.
 */
export async function applyRenewalSettlement(
	repositories: Pick<
		BillingRepositories["subscriptions"],
		"findCurrentByUser" | "update" | "create" | "invalidateCache"
	>,
	clock: ClockPort,
	invoice: TransactionInvoice
): Promise<Subscription> {
	return applySettlement(
		repositories,
		clock,
		invoice,
		(existing, currentInvoice, now) =>
			buildRenewalSettlement(existing, currentInvoice, now)
	);
}

/**
 * Applies new subscription payment settlement.
 */
export async function applyNewSubscriptionSettlement(
	repositories: Pick<
		BillingRepositories["subscriptions"],
		"findCurrentByUser" | "update" | "create" | "invalidateCache"
	>,
	clock: ClockPort,
	invoice: TransactionInvoice
): Promise<Subscription> {
	return applySettlement(
		repositories,
		clock,
		invoice,
		(_existing, currentInvoice, now) =>
			buildNewSubscriptionSettlement(currentInvoice, now)
	);
}

/**
 * Cancels a subscription — either gracefully at period end or immediately.
 */
export async function cancelSubscription(
	repositories: Pick<
		BillingRepositories["subscriptions"],
		"findById" | "findCurrentByUser" | "update"
	>,
	opts: {
		userId: string;
		subscriptionId?: string;
		cancelAtPeriodEnd?: boolean;
	},
	clock: ClockPort
): Promise<Subscription | null> {
	const subscription = opts.subscriptionId
		? await repositories.findById(opts.subscriptionId)
		: await repositories.findCurrentByUser(opts.userId);

	if (!subscription) {
		return null;
	}

	const updatePayload = buildCancellationUpdate(
		clock.now(),
		opts.cancelAtPeriodEnd ?? true
	);

	const updated = await repositories.update(subscription.id, updatePayload);

	return updated ?? { ...subscription, ...updatePayload };
}

/**
 * Restores a subscription that was canceled at period end.
 */
export async function restoreSubscription(
	repositories: Pick<
		BillingRepositories["subscriptions"],
		"findById" | "findCurrentByUser" | "update"
	>,
	opts: {
		userId: string;
		subscriptionId?: string;
	}
): Promise<boolean> {
	const subscription = opts.subscriptionId
		? await repositories.findById(opts.subscriptionId)
		: await repositories.findCurrentByUser(opts.userId);

	if (!subscription || !subscription.cancel_at_period_end) {
		return false;
	}

	await repositories.update(subscription.id, buildRestoreUpdate());

	return true;
}

/**
 * Resolves the user's full subscription state and feature access.
 */
export async function resolveUserSubscription(
	repositories: BillingRepositories,
	userId: string,
	clock: ClockPort
): Promise<UserSubscription> {
	const subscription = await getUserSubscription(
		repositories.subscriptions,
		userId
	);

	if (!subscription) {
		return buildFreeUserSubscription();
	}

	const plan = await getPlanById(repositories.plans, subscription.plan_id);
	return buildUserSubscription(subscription, plan, clock.now());
}

/**
 * Admin override used by `POST /subscription/update`.
 */
export async function updateSubscriptionRecord(
	repositories: BillingRepositories,
	input: AdminSubscriptionUpdateInput & {
		subscriptionId?: string;
		userId?: string;
	}
): Promise<Subscription | null> {
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
