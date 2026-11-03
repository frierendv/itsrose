import type {
	ApiPlan,
	BillingInterval,
	Subscription,
	SubscriptionStatus,
	TransactionInvoice,
	UserSubscription,
} from "../types";
import {
	BILLING_PERIOD_MS,
	FREE_PLAN,
	RATE_LIMIT,
	SUBSCRIPTION_STATUS,
} from "./constants";
import { getRateLimitForPlan, normalizePlan } from "./plan.service";
import { isTierDowngrade } from "./proration";

const NON_TERMINAL_STATUSES: readonly SubscriptionStatus[] = [
	SUBSCRIPTION_STATUS.ACTIVE,
	SUBSCRIPTION_STATUS.PENDING_PAYMENT,
	SUBSCRIPTION_STATUS.PAST_DUE,
];

export function isNonTerminalStatus(status: SubscriptionStatus): boolean {
	return NON_TERMINAL_STATUSES.includes(status);
}

/**
 * True when the subscription is in a billable state and the paid period has
 * not elapsed yet.
 */
export function isSubscriptionActive(
	subscription: Subscription,
	now: Date | number = Date.now()
): boolean {
	const nowMs = typeof now === "number" ? now : now.getTime();
	return (
		isNonTerminalStatus(subscription.status) &&
		new Date(subscription.period_end).getTime() >= nowMs
	);
}

/**
 * Returns the subscription that should be treated as the user's current one:
 * first a non-terminal subscription inside its paid period, then the most
 * recent record by period end (or creation date).
 */
export function selectCurrentSubscription(
	subscriptions: readonly Subscription[],
	now: Date | number = Date.now()
): Subscription | null {
	if (subscriptions.length === 0) {
		return null;
	}

	const active = subscriptions.find((subscription) =>
		isSubscriptionActive(subscription, now)
	);
	if (active) {
		return active;
	}

	return subscriptions.reduce((latest, subscription) => {
		const latestEnd = new Date(
			latest.period_end || latest.created_at || 0
		).getTime();
		const subscriptionEnd = new Date(
			subscription.period_end || subscription.created_at || 0
		).getTime();
		return subscriptionEnd > latestEnd ? subscription : latest;
	});
}

/**
 * Calculates subscription period dates from a paid date and interval.
 */
export function calculateSubscriptionPeriod(
	paidDateInput: string | Date,
	interval: BillingInterval = "month"
) {
	const periodStart = new Date(paidDateInput);
	const periodEnd = new Date(periodStart);

	if (interval === "year") {
		periodEnd.setFullYear(periodEnd.getFullYear() + 1);
	} else {
		periodEnd.setMonth(periodEnd.getMonth() + 1);
	}

	return {
		periodStart,
		periodEnd,
		isActive: periodEnd.getTime() > Date.now(),
	};
}

/**
 * User has access while the subscription is active inside the paid period, or
 * while it is in the post-expiry grace window.
 */
export function hasSubscriptionAccess(
	subscription: Subscription,
	now: Date | number = Date.now()
): boolean {
	const nowMs = typeof now === "number" ? now : now.getTime();
	const periodEndMs = new Date(subscription.period_end).getTime();
	const isWithinPeriod = periodEndMs >= nowMs;
	const isWithinGrace =
		Boolean(subscription.grace_period_end) &&
		new Date(subscription.grace_period_end as Date | string).getTime() >=
			nowMs;

	return (
		(subscription.status === SUBSCRIPTION_STATUS.ACTIVE &&
			isWithinPeriod) ||
		isWithinGrace
	);
}

/**
 * Derives the status surfaced to clients when the paid period has elapsed but
 * the stored status is still `active`.
 */
export function deriveEffectiveStatus(
	subscription: Subscription,
	now: Date | number = Date.now()
): SubscriptionStatus {
	const nowMs = typeof now === "number" ? now : now.getTime();
	const isWithinPeriod = new Date(subscription.period_end).getTime() >= nowMs;
	const isWithinGrace =
		Boolean(subscription.grace_period_end) &&
		new Date(subscription.grace_period_end as Date | string).getTime() >=
			nowMs;

	if (!isWithinPeriod && subscription.status === SUBSCRIPTION_STATUS.ACTIVE) {
		return isWithinGrace
			? SUBSCRIPTION_STATUS.PAST_DUE
			: SUBSCRIPTION_STATUS.EXPIRED;
	}

	return subscription.status;
}

/**
 * Maps a stored subscription + plan into the public `UserSubscription` DTO.
 */
export function buildUserSubscription(
	subscription: Subscription,
	plan: ApiPlan | null,
	now: Date | number = Date.now()
): UserSubscription {
	const resolvedPlan =
		plan ?? normalizePlan(FREE_PLAN as unknown as Record<string, unknown>);
	const rateLimit = getRateLimitForPlan(resolvedPlan.plan_id);

	return {
		has_access: hasSubscriptionAccess(subscription, now),
		plan: resolvedPlan,
		status: deriveEffectiveStatus(subscription, now),
		period_start: new Date(subscription.period_start),
		expires_at: new Date(subscription.period_end),
		scheduled_tier: subscription.scheduled_tier ?? null,
		grace_period_end: subscription.grace_period_end
			? new Date(subscription.grace_period_end)
			: null,
		subscription_id: subscription.id,
		cancel_at_period_end: Boolean(subscription.cancel_at_period_end),
		invoice_id: subscription.invoice_id ?? undefined,
		order_id: subscription.order_id ?? undefined,
		rate_limit: rateLimit,
	};
}

/**
 * Default state for users without any subscription record.
 */
export function buildFreeUserSubscription(): UserSubscription {
	return {
		has_access: false,
		plan: normalizePlan(FREE_PLAN as unknown as Record<string, unknown>),
		status: SUBSCRIPTION_STATUS.ACTIVE,
		period_start: null,
		expires_at: null,
		scheduled_tier: null,
		grace_period_end: null,
		rate_limit: RATE_LIMIT.free,
	};
}

export interface SubscriptionUpsertInput {
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

export function buildSubscriptionUpsertPayload(
	input: SubscriptionUpsertInput
): Record<string, unknown> {
	return {
		user_id: input.user_id,
		plan_id: input.plan_id,
		interval: input.interval ?? "month",
		status: input.status ?? SUBSCRIPTION_STATUS.ACTIVE,
		period_start: input.period_start,
		period_end: input.period_end,
		scheduled_tier: input.scheduled_tier ?? null,
		grace_period_end: input.grace_period_end ?? null,
		cancel_at_period_end: input.cancel_at_period_end ?? false,
		invoice_id: input.invoice_id ?? null,
		order_id: input.order_id ?? null,
	};
}

function resolvePaidDate(invoice: TransactionInvoice): Date {
	return invoice.paid_date ? new Date(invoice.paid_date) : new Date();
}

/**
 * Mid-cycle upgrade settlement:
 * - unlocks the higher tier immediately;
 * - keeps the existing cycle anchor for normal prorated upgrades;
 * - resets the period when proration requested a full cycle reset.
 */
export function buildUpgradeSettlement(
	existing: Subscription | null,
	invoice: TransactionInvoice
): Partial<Subscription> {
	const paidDate = resolvePaidDate(invoice);
	const isCycleReset = Boolean(invoice.proration_details?.is_cycle_reset);

	let periodStart = paidDate;
	let periodEnd = new Date(paidDate.getTime() + BILLING_PERIOD_MS);

	if (existing && !isCycleReset) {
		periodStart = new Date(existing.period_start);
		periodEnd = new Date(existing.period_end);
	}

	return {
		plan_id: invoice.target_tier,
		status: SUBSCRIPTION_STATUS.ACTIVE,
		period_start: periodStart,
		period_end: periodEnd,
		scheduled_tier: null,
		grace_period_end: null,
		invoice_id: invoice.invoice_id,
		order_id: invoice.order_id,
	};
}

/**
 * Renewal settlement:
 * - applies the renewed (or scheduled) tier;
 * - advances the cycle anchor by 30 days from the previous period end when
 *   that end is still in the future relative to the paid date.
 */
export function buildRenewalSettlement(
	existing: Subscription | null,
	invoice: TransactionInvoice
): Partial<Subscription> {
	const paidDate = resolvePaidDate(invoice);
	const anchorStart =
		existing && new Date(existing.period_end).getTime() > paidDate.getTime()
			? new Date(existing.period_end)
			: paidDate;

	return {
		plan_id: invoice.target_tier,
		status: SUBSCRIPTION_STATUS.ACTIVE,
		period_start: anchorStart,
		period_end: new Date(anchorStart.getTime() + BILLING_PERIOD_MS),
		scheduled_tier: null,
		grace_period_end: null,
		cancel_at_period_end: false,
		invoice_id: invoice.invoice_id,
		order_id: invoice.order_id,
	};
}

/**
 * New subscription settlement: full 30-day period from the paid date.
 */
export function buildNewSubscriptionSettlement(
	invoice: TransactionInvoice
): Partial<Subscription> {
	const paidDate = resolvePaidDate(invoice);

	return {
		plan_id: invoice.target_tier,
		status: SUBSCRIPTION_STATUS.ACTIVE,
		period_start: paidDate,
		period_end: new Date(paidDate.getTime() + BILLING_PERIOD_MS),
		scheduled_tier: null,
		grace_period_end: null,
		cancel_at_period_end: false,
		invoice_id: invoice.invoice_id,
		order_id: invoice.order_id,
	};
}

export function buildCancellationUpdate(
	now: Date,
	cancelAtPeriodEnd = true
): Partial<Subscription> {
	if (cancelAtPeriodEnd) {
		return { cancel_at_period_end: true, canceled_at: now };
	}

	return {
		status: SUBSCRIPTION_STATUS.CANCELED,
		ended_at: now,
		canceled_at: now,
		cancel_at_period_end: false,
	};
}

export function buildRestoreUpdate(): Partial<Subscription> {
	return { cancel_at_period_end: false, canceled_at: null };
}

export type AdminSubscriptionUpdateInput = {
	plan_id?: string;
	interval?: BillingInterval;
	status?: SubscriptionStatus;
	period_start?: string;
	period_end?: string;
	scheduled_tier?: string | null;
	cancel_at_period_end?: boolean;
};

export function buildAdminSubscriptionUpdate(
	input: AdminSubscriptionUpdateInput
): Partial<Subscription> {
	const update: Partial<Subscription> = {};

	if (input.plan_id !== undefined) {
		update.plan_id = input.plan_id;
	}
	if (input.interval !== undefined) {
		update.interval = input.interval;
	}
	if (input.status !== undefined) {
		update.status = input.status;
	}
	if (input.period_start !== undefined) {
		update.period_start = new Date(input.period_start);
	}
	if (input.period_end !== undefined) {
		update.period_end = new Date(input.period_end);
	}
	if (input.scheduled_tier !== undefined) {
		update.scheduled_tier = input.scheduled_tier;
	}
	if (input.cancel_at_period_end !== undefined) {
		update.cancel_at_period_end = input.cancel_at_period_end;
	}

	return update;
}

export type DowngradeDecision =
	| {
			action: "reject";
			reason: "no_active_subscription" | "same_tier" | "not_downgrade";
			currentTier?: string;
	  }
	| { action: "schedule"; currentTier: string; targetTier: string };

/**
 * Pure validation for `POST /subscription/downgrade`.
 * A downgrade never mutates the active tier immediately; it only records
 * `scheduled_tier` for the next renewal.
 */
export function planDowngrade(
	subscription: Subscription | null,
	targetTier: string
): DowngradeDecision {
	if (!subscription || subscription.status !== SUBSCRIPTION_STATUS.ACTIVE) {
		return { action: "reject", reason: "no_active_subscription" };
	}

	const currentTier = subscription.plan_id.toLowerCase();
	const normalizedTarget = targetTier.toLowerCase();

	if (currentTier === normalizedTarget) {
		return {
			action: "reject",
			reason: "same_tier",
			currentTier,
		};
	}

	if (!isTierDowngrade(currentTier, normalizedTarget)) {
		return {
			action: "reject",
			reason: "not_downgrade",
			currentTier,
		};
	}

	return { action: "schedule", currentTier, targetTier: normalizedTarget };
}

export type CancelDowngradeDecision =
	| { action: "reject"; reason: "no_subscription" | "nothing_scheduled" }
	| { action: "cancel" };

export function planCancelDowngrade(
	subscription: Subscription | null
): CancelDowngradeDecision {
	if (!subscription) {
		return { action: "reject", reason: "no_subscription" };
	}

	if (!subscription.scheduled_tier) {
		return { action: "reject", reason: "nothing_scheduled" };
	}

	return { action: "cancel" };
}
