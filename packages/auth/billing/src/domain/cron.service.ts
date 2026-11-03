import type { Subscription } from "../types";
import {
	GRACE_PERIOD_MS,
	RENEWAL_DISPATCH_LEAD_MS,
	SUBSCRIPTION_STATUS,
} from "./constants";

export interface BillingCronOptions {
	now?: Date | string | number;
	leadMs?: number;
	graceMs?: number;
}

export interface CronWindow {
	now: Date;
	nowMs: number;
	leadMs: number;
	graceMs: number;
	/** Latest period end that still belongs to the renewal window. */
	renewalThreshold: Date;
	/** Earliest period end that is still inside the grace window. */
	pastGraceThreshold: Date;
}

export function resolveCronWindow(opts?: BillingCronOptions): CronWindow {
	const now = opts?.now ? new Date(opts.now) : new Date();
	const nowMs = now.getTime();
	const leadMs = opts?.leadMs ?? RENEWAL_DISPATCH_LEAD_MS;
	const graceMs = opts?.graceMs ?? GRACE_PERIOD_MS;

	return {
		now,
		nowMs,
		leadMs,
		graceMs,
		renewalThreshold: new Date(nowMs + leadMs),
		pastGraceThreshold: new Date(nowMs - graceMs),
	};
}

/**
 * A subscription is due for a renewal invoice when it is still billable, not
 * scheduled to cancel, and its period end falls inside the D-3 dispatch window
 * (or shortly after it, while still in grace).
 */
export function isRenewalCandidate(
	subscription: Subscription,
	window: CronWindow
): boolean {
	if (
		subscription.cancel_at_period_end ||
		subscription.status === SUBSCRIPTION_STATUS.CANCELED ||
		subscription.status === SUBSCRIPTION_STATUS.EXPIRED
	) {
		return false;
	}

	const periodEndMs = new Date(subscription.period_end).getTime();

	return (
		periodEndMs <= window.renewalThreshold.getTime() &&
		periodEndMs > window.pastGraceThreshold.getTime()
	);
}

/**
 * Scheduled tier takes precedence over the current plan for renewals.
 */
export function resolveRenewalTier(subscription: Subscription): string {
	return (subscription.scheduled_tier || subscription.plan_id).toLowerCase();
}

export function buildRenewalInvoiceDates(
	subscription: Subscription,
	window: CronWindow
): { invoiceDate: string; dueDate: string } {
	const periodEndMs = new Date(subscription.period_end).getTime();
	const dueDate =
		periodEndMs > window.nowMs
			? new Date(periodEndMs).toISOString()
			: new Date(window.nowMs + window.leadMs).toISOString();

	return { invoiceDate: window.now.toISOString(), dueDate };
}

/**
 * Active subscriptions whose paid period ended, but whose grace window is
 * still open, must transition to PAST_DUE.
 */
export function isGraceTrackingCandidate(
	subscription: Subscription,
	window: CronWindow
): boolean {
	const periodEndMs = new Date(subscription.period_end).getTime();

	return (
		periodEndMs <= window.nowMs &&
		window.nowMs < periodEndMs + window.graceMs
	);
}

export function buildGraceUpdate(
	subscription: Subscription,
	window: CronWindow
): Partial<Subscription> {
	const periodEndMs = new Date(subscription.period_end).getTime();

	return {
		status: SUBSCRIPTION_STATUS.PAST_DUE,
		grace_period_end: new Date(periodEndMs + window.graceMs),
	};
}

/**
 * Subscriptions past their (explicit or implicit) grace limit are expired.
 */
export function isSweepCandidate(
	subscription: Subscription,
	window: CronWindow
): boolean {
	if (
		subscription.status === SUBSCRIPTION_STATUS.EXPIRED ||
		subscription.status === SUBSCRIPTION_STATUS.CANCELED
	) {
		return false;
	}

	const periodEndMs = new Date(subscription.period_end).getTime();
	const graceLimitMs = subscription.grace_period_end
		? new Date(subscription.grace_period_end).getTime()
		: periodEndMs + window.graceMs;

	return window.nowMs >= graceLimitMs;
}

export function buildExpiryUpdate(window: CronWindow): Partial<Subscription> {
	return {
		status: SUBSCRIPTION_STATUS.EXPIRED,
		plan_id: "free",
		scheduled_tier: null,
		grace_period_end: null,
		ended_at: window.now,
	};
}
