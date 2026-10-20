import type { GenericEndpointContext, SecondaryStorage } from "better-auth";
import { deserialize, normalizePlan, serialize } from "../server";
import {
	BILLING_PERIOD_MS,
	FREE_PLAN,
	RATE_LIMIT,
	SUBSCRIPTION_STATUS,
	SUBSCRIPTION_TABLE_NAME,
} from "../server/constants";
import type {
	BillingInterval,
	Subscription,
	SubscriptionStatus,
	TransactionInvoice,
	UserSubscription,
} from "../types";
import { getPlanById } from "./plan";
import { getDbAdapterInstance, getStorageInstance } from "./storage";

const CACHE_KEY = "subscription:by-id" as const;

function calculateTTL(subscription: Subscription): number | undefined {
	if (subscription.period_end) {
		const now = Date.now();
		const expiresAt = new Date(subscription.period_end).getTime();
		const ttlSeconds = Math.floor((expiresAt - now) / 1000);
		if (ttlSeconds > 0) {
			return ttlSeconds;
		}
	}
	return undefined;
}

function getStorageKeyById(userId: string) {
	return `${CACHE_KEY}:${userId}`;
}

async function getUserSubscriptionFromStorage(
	userId: string,
	storage: SecondaryStorage
) {
	const key = getStorageKeyById(userId);
	const data = await storage.get(key);
	return deserialize<Subscription>(data);
}

export async function setUserSubscriptionInStorage(
	subscription: Subscription | undefined | null,
	userId: string,
	storage: SecondaryStorage
) {
	const key = getStorageKeyById(userId);
	if (!subscription) {
		await storage.set(key, "null", 60);
		return;
	}
	const ttl = calculateTTL(subscription);
	const serialized = serialize(subscription);
	await storage.set(key, serialized, ttl);
}

export async function invalidateUserSubscriptionCache(
	ctx: GenericEndpointContext,
	userId: string
): Promise<void> {
	const storage = getStorageInstance(ctx);
	if (storage) {
		const key = getStorageKeyById(userId);
		await storage.delete(key);
	}
}

/**
 * Returns the user's authoritative subscription from storage or database.
 */
export async function getUserSubscription(
	ctx: GenericEndpointContext,
	userId: string
): Promise<Subscription | null> {
	const storage = getStorageInstance(ctx);
	if (storage) {
		const fromStorage = await getUserSubscriptionFromStorage(
			userId,
			storage
		);
		if (fromStorage) {
			return fromStorage;
		}
	}

	const adapter = getDbAdapterInstance(ctx);
	const subscriptions = await adapter.findMany<Subscription>({
		model: SUBSCRIPTION_TABLE_NAME,
		where: [{ field: "user_id", value: userId }],
	});

	if (!subscriptions || subscriptions.length === 0) {
		if (storage) {
			await setUserSubscriptionInStorage(null, userId, storage);
		}
		return null;
	}

	const now = Date.now();

	// Prefer active/trialing/past_due subscription within valid period
	const active = subscriptions.find((sub) => {
		const isNotTerminal =
			sub.status === SUBSCRIPTION_STATUS.ACTIVE ||
			sub.status === SUBSCRIPTION_STATUS.PENDING_PAYMENT ||
			sub.status === SUBSCRIPTION_STATUS.PAST_DUE;
		const endsAt = new Date(sub.period_end).getTime();
		return isNotTerminal && endsAt >= now;
	});

	const result =
		active ??
		subscriptions.reduce((latest, sub) => {
			const latestEnd = new Date(
				latest.period_end || latest.created_at || 0
			).getTime();
			const subEnd = new Date(
				sub.period_end || sub.created_at || 0
			).getTime();
			return subEnd > latestEnd ? sub : latest;
		});

	if (storage && result) {
		await setUserSubscriptionInStorage(result, userId, storage);
	}

	return result;
}

/**
 * Creates or updates a base subscription record.
 */
export async function createOrUpdateSubscription(
	ctx: GenericEndpointContext,
	data: {
		user_id: string;
		plan_id: string;
		interval?: BillingInterval | null;
		status?: SubscriptionStatus;
		period_start: Date;
		period_end: Date;
		scheduled_tier?: string | null;
		grace_period_end?: Date | null;
		cancel_at_period_end?: boolean;
		invoice_id?: string | null;
		order_id?: string | null;
	}
): Promise<Subscription> {
	const existing = await getUserSubscription(ctx, data.user_id);
	const payload = {
		user_id: data.user_id,
		plan_id: data.plan_id,
		interval: data.interval ?? "month",
		status: data.status ?? SUBSCRIPTION_STATUS.ACTIVE,
		period_start: data.period_start,
		period_end: data.period_end,
		scheduled_tier: data.scheduled_tier ?? null,
		grace_period_end: data.grace_period_end ?? null,
		cancel_at_period_end: data.cancel_at_period_end ?? false,
		invoice_id: data.invoice_id ?? null,
		order_id: data.order_id ?? null,
	};

	const adapter = getDbAdapterInstance(ctx);
	let result: Subscription;

	if (existing) {
		await adapter.update({
			model: SUBSCRIPTION_TABLE_NAME,
			where: [{ field: "id", value: existing.id }],
			update: payload,
		});

		const updated = await adapter.findOne<Subscription>({
			model: SUBSCRIPTION_TABLE_NAME,
			where: [{ field: "id", value: existing.id }],
		});
		result = updated ?? { ...existing, ...payload };
	} else {
		result = await adapter.create<Subscription>({
			model: SUBSCRIPTION_TABLE_NAME,
			data: payload as unknown as Subscription,
		});
	}

	await invalidateUserSubscriptionCache(ctx, data.user_id);
	return result;
}

/**
 * Schedules a downgrade for the subscription to be executed at the next renewal cycle.
 * Does NOT change active tier, issue refunds, or generate invoices immediately.
 */
export async function scheduleDowngrade(
	ctx: GenericEndpointContext,
	userId: string,
	targetTier: string
): Promise<Subscription | null> {
	const sub = await getUserSubscription(ctx, userId);
	if (!sub) {
		return null;
	}

	const adapter = getDbAdapterInstance(ctx);
	await adapter.update({
		model: SUBSCRIPTION_TABLE_NAME,
		where: [{ field: "id", value: sub.id }],
		update: { scheduled_tier: targetTier },
	});

	await invalidateUserSubscriptionCache(ctx, userId);

	return {
		...sub,
		scheduled_tier: targetTier,
	};
}

/**
 * Cancels a pending scheduled downgrade, reverting scheduled_tier to null.
 */
export async function cancelScheduledDowngrade(
	ctx: GenericEndpointContext,
	userId: string
): Promise<Subscription | null> {
	const sub = await getUserSubscription(ctx, userId);
	if (!sub) {
		return null;
	}

	const adapter = getDbAdapterInstance(ctx);
	await adapter.update({
		model: SUBSCRIPTION_TABLE_NAME,
		where: [{ field: "id", value: sub.id }],
		update: { scheduled_tier: null },
	});

	await invalidateUserSubscriptionCache(ctx, userId);

	return {
		...sub,
		scheduled_tier: null,
	};
}

/**
 * Applies mid-cycle upgrade payment settlement:
 * - Unlocks higher tier immediately.
 * - If normal prorated upgrade: keeps existing current_period_end anchor intact.
 * - If full cycle reset (under 24h or trivial): resets period_start to paidDate and period_end to +30 days.
 */
export async function applyUpgradeSettlement(
	ctx: GenericEndpointContext,
	invoice: TransactionInvoice
): Promise<Subscription> {
	const existing = await getUserSubscription(ctx, invoice.user_id);
	const paidDate = invoice.paid_date
		? new Date(invoice.paid_date)
		: new Date();

	const isCycleReset = Boolean(invoice.proration_details?.is_cycle_reset);

	let periodStart: Date;
	let periodEnd: Date;

	if (isCycleReset || !existing) {
		periodStart = paidDate;
		periodEnd = new Date(paidDate.getTime() + BILLING_PERIOD_MS);
	} else {
		// Keep cycle anchor intact
		periodStart = new Date(existing.period_start);
		periodEnd = new Date(existing.period_end);
	}

	const adapter = getDbAdapterInstance(ctx);

	const payload: Partial<Subscription> = {
		plan_id: invoice.target_tier,
		status: SUBSCRIPTION_STATUS.ACTIVE,
		period_start: periodStart,
		period_end: periodEnd,
		scheduled_tier: null,
		grace_period_end: null,
		invoice_id: invoice.invoice_id,
		order_id: invoice.order_id,
	};

	let updated: Subscription;

	if (existing) {
		await adapter.update({
			model: SUBSCRIPTION_TABLE_NAME,
			where: [{ field: "id", value: existing.id }],
			update: payload,
		});
		updated = { ...existing, ...payload } as Subscription;
	} else {
		updated = await adapter.create<Subscription>({
			model: SUBSCRIPTION_TABLE_NAME,
			data: {
				user_id: invoice.user_id,
				...payload,
			} as unknown as Subscription,
		});
	}

	await invalidateUserSubscriptionCache(ctx, invoice.user_id);
	return updated;
}

/**
 * Applies renewal payment settlement:
 * - Unlocks target/renewed tier (or scheduled_tier).
 * - Advances cycle anchor by 30 days from previous period_end.
 * - Clears scheduled_tier and grace_period_end.
 */
export async function applyRenewalSettlement(
	ctx: GenericEndpointContext,
	invoice: TransactionInvoice
): Promise<Subscription> {
	const existing = await getUserSubscription(ctx, invoice.user_id);
	const now = new Date();

	// Advance cycle anchor from previous period_end if future, else from now
	let anchorStart: Date;
	if (existing && new Date(existing.period_end).getTime() > now.getTime()) {
		anchorStart = new Date(existing.period_end);
	} else {
		anchorStart = now;
	}

	const newPeriodEnd = new Date(anchorStart.getTime() + BILLING_PERIOD_MS);
	const newTier = invoice.target_tier;

	const adapter = getDbAdapterInstance(ctx);
	const payload: Partial<Subscription> = {
		plan_id: newTier,
		status: SUBSCRIPTION_STATUS.ACTIVE,
		period_start: anchorStart,
		period_end: newPeriodEnd,
		scheduled_tier: null,
		grace_period_end: null,
		cancel_at_period_end: false,
		invoice_id: invoice.invoice_id,
		order_id: invoice.order_id,
	};

	let updated: Subscription;

	if (existing) {
		await adapter.update({
			model: SUBSCRIPTION_TABLE_NAME,
			where: [{ field: "id", value: existing.id }],
			update: payload,
		});
		updated = { ...existing, ...payload } as Subscription;
	} else {
		updated = await adapter.create<Subscription>({
			model: SUBSCRIPTION_TABLE_NAME,
			data: {
				user_id: invoice.user_id,
				...payload,
			} as unknown as Subscription,
		});
	}

	await invalidateUserSubscriptionCache(ctx, invoice.user_id);
	return updated;
}

/**
 * Applies new subscription payment settlement:
 * - Starts full 30-day period from paid date.
 */
export async function applyNewSubscriptionSettlement(
	ctx: GenericEndpointContext,
	invoice: TransactionInvoice
): Promise<Subscription> {
	const paidDate = invoice.paid_date
		? new Date(invoice.paid_date)
		: new Date();
	const periodEnd = new Date(paidDate.getTime() + BILLING_PERIOD_MS);

	return createOrUpdateSubscription(ctx, {
		user_id: invoice.user_id,
		plan_id: invoice.target_tier,
		interval: "month",
		status: SUBSCRIPTION_STATUS.ACTIVE,
		period_start: paidDate,
		period_end: periodEnd,
		scheduled_tier: null,
		cancel_at_period_end: false,
		invoice_id: invoice.invoice_id,
		order_id: invoice.order_id,
	});
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
	const adapter = getDbAdapterInstance(ctx);

	let sub: Subscription | undefined | null;
	if (opts.subscriptionId) {
		sub = await adapter.findOne<Subscription>({
			model: SUBSCRIPTION_TABLE_NAME,
			where: [{ field: "id", value: opts.subscriptionId }],
		});
	} else {
		sub = await getUserSubscription(ctx, opts.userId);
	}

	if (!sub) {
		return null;
	}

	const cancelAtPeriodEnd = opts.cancelAtPeriodEnd ?? true;
	const now = new Date();

	const updatePayload: Partial<Subscription> = cancelAtPeriodEnd
		? { cancel_at_period_end: true, canceled_at: now }
		: {
				status: SUBSCRIPTION_STATUS.CANCELED,
				ended_at: now,
				canceled_at: now,
				cancel_at_period_end: false,
			};

	await adapter.update({
		model: SUBSCRIPTION_TABLE_NAME,
		where: [{ field: "id", value: sub.id }],
		update: updatePayload,
	});

	await invalidateUserSubscriptionCache(ctx, sub.user_id);

	return { ...sub, ...updatePayload };
}

/**
 * Restores a canceled subscription (if canceled at period end).
 */
export async function restoreSubscription(
	ctx: GenericEndpointContext,
	opts: {
		userId: string;
		subscriptionId?: string;
	}
): Promise<boolean> {
	const adapter = getDbAdapterInstance(ctx);

	let sub: Subscription | undefined | null;
	if (opts.subscriptionId) {
		sub = await adapter.findOne<Subscription>({
			model: SUBSCRIPTION_TABLE_NAME,
			where: [{ field: "id", value: opts.subscriptionId }],
		});
	} else {
		sub = await getUserSubscription(ctx, opts.userId);
	}

	if (!sub || !sub.cancel_at_period_end) {
		return false;
	}

	const restoringPayload: Partial<Subscription> = {
		cancel_at_period_end: false,
		canceled_at: null,
	};

	await adapter.update({
		model: SUBSCRIPTION_TABLE_NAME,
		where: [{ field: "id", value: sub.id }],
		update: restoringPayload,
	});

	await invalidateUserSubscriptionCache(ctx, sub.user_id);
	return true;
}

/**
 * Resolves the user's full subscription state and feature access.
 */
export async function resolveUserSubscription(
	ctx: GenericEndpointContext,
	userId: string
): Promise<UserSubscription> {
	const sub = await getUserSubscription(ctx, userId);

	if (!sub) {
		return {
			has_access: false,
			plan: normalizePlan(FREE_PLAN),
			status: SUBSCRIPTION_STATUS.ACTIVE,
			period_start: null,
			expires_at: null,
			scheduled_tier: null,
			grace_period_end: null,
			rate_limit: RATE_LIMIT.free,
		};
	}

	const now = Date.now();
	const periodStart = new Date(sub.period_start);
	const periodEnd = new Date(sub.period_end);
	const isWithinPeriod = periodEnd.getTime() >= now;

	// In grace period (PAST_DUE but grace_period_end is in the future)
	const isWithinGrace =
		sub.grace_period_end && new Date(sub.grace_period_end).getTime() >= now;

	const isStatusActive = sub.status === SUBSCRIPTION_STATUS.ACTIVE;

	// User has access if active and in period, or during grace period
	const hasAccess =
		(isStatusActive && isWithinPeriod) || Boolean(isWithinGrace);

	// Effective status derivation
	let effectiveStatus: SubscriptionStatus = sub.status;
	if (!isWithinPeriod && sub.status === SUBSCRIPTION_STATUS.ACTIVE) {
		effectiveStatus = isWithinGrace
			? SUBSCRIPTION_STATUS.PAST_DUE
			: SUBSCRIPTION_STATUS.EXPIRED;
	}

	const plan =
		(await getPlanById(ctx, sub.plan_id)) || normalizePlan(FREE_PLAN);
	const rateLimit =
		RATE_LIMIT[plan.plan_id as keyof typeof RATE_LIMIT] ?? RATE_LIMIT.free;

	return {
		has_access: hasAccess,
		plan,
		status: effectiveStatus,
		period_start: periodStart,
		expires_at: periodEnd,
		scheduled_tier: sub.scheduled_tier ?? null,
		grace_period_end: sub.grace_period_end
			? new Date(sub.grace_period_end)
			: null,
		subscription_id: sub.id,
		cancel_at_period_end: Boolean(sub.cancel_at_period_end),
		invoice_id: sub.invoice_id ?? undefined,
		order_id: sub.order_id ?? undefined,
		rate_limit: rateLimit,
	};
}
