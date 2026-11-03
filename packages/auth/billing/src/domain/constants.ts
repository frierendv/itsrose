import type { ApiPlan, RateLimit } from "../types";

/**
 * Public plugin id. Kept as `itsrose` so existing `/itsrose/*` routes and
 * `authClient.itsrose.*` calls remain valid after the package split.
 */
export const ITSROSE_PLUGIN_ID = "itsrose" as const;
export const BILLING_PLUGIN_ID = ITSROSE_PLUGIN_ID;

export const SUBSCRIPTION_TABLE_NAME = "subscriptions" as const;
export const INVOICE_SEQUENCE_TABLE_NAME = "invoice_sequence" as const;
export const INVOICE_TABLE_NAME = "transaction_invoices" as const;
export const INVOICE_EVENT_TABLE_NAME = "transaction_events" as const;
export const API_PLAN_TABLE_NAME = "api_plans" as const;

export const DEFAULT_INVOICE_DUE_DAYS = 3 as const;
export const DEFAULT_INVOICE_PREFIX = "INV" as const;
export const DEFAULT_ORDER_PREFIX = "ORD" as const;
export const DEFAULT_CURRENCY = "IDR" as const;

/**
 * Standard 30-day billing cycle durations.
 */
export const BILLING_PERIOD_DAYS = 30 as const;
export const BILLING_PERIOD_MS = BILLING_PERIOD_DAYS * 24 * 60 * 60 * 1000; // 2,592,000,000 ms
export const UNDER_24_HOURS_MS = 24 * 60 * 60 * 1000; // 86,400,000 ms

/**
 * Mid-cycle upgrade invoice lifespan (2 hours).
 */
export const UPGRADE_INVOICE_LIFESPAN_HOURS = 2 as const;
export const UPGRADE_INVOICE_LIFESPAN_MS =
	UPGRADE_INVOICE_LIFESPAN_HOURS * 60 * 60 * 1000;

/**
 * Scheduled renewal dispatch window: D-3 before current_period_end.
 */
export const RENEWAL_DISPATCH_LEAD_DAYS = 3 as const;
export const RENEWAL_DISPATCH_LEAD_MS =
	RENEWAL_DISPATCH_LEAD_DAYS * 24 * 60 * 60 * 1000;

/**
 * Grace period after period_end before moving from PAST_DUE to EXPIRED (3 days).
 */
export const GRACE_PERIOD_DAYS = 3 as const;
export const GRACE_PERIOD_MS = GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000;

/**
 * Subscription status constants.
 */
export const SUBSCRIPTION_STATUS = {
	ACTIVE: "active",
	PENDING_PAYMENT: "pending_payment",
	PAST_DUE: "past_due",
	EXPIRED: "expired",
	CANCELED: "canceled",
} as const;

/**
 * Invoice type constants.
 */
export const INVOICE_TYPE = {
	NEW: "NEW",
	UPGRADE: "UPGRADE",
	RENEWAL: "RENEWAL",
} as const;

/* Hardcoded price */
export const FREE_PLAN = {
	plan_id: "free" as const,
	name: "Free",
	description: "Get started with the API at no cost.",
	price: {
		amount: 0,
		currency: "IDR",
		interval: "month",
	},
	features: [
		"10 API Requests per Minute (RPM)",
		"24-Hour Request Logs",
		"Basic Analytics",
		"Community Support",
	],
	limits: { max: 10, timeWindow: 60_000 },
	highlighted: false,
} satisfies ApiPlan<true>;

export const HOBBY_PLAN = {
	plan_id: "hobby" as const,
	name: "Hobby",
	description: "For personal projects and small applications.",
	price: {
		amount: 60_000,
		currency: "IDR",
		interval: "month",
	},
	features: [
		"60 API Requests per Minute (RPM)",
		"7-Day Request Logs",
		"Basic Analytics",
		"Webhooks",
		"Email Support",
	],
	limits: { max: 60, timeWindow: 60_000 },
	highlighted: false,
} satisfies ApiPlan<true>;

export const PRO_PLAN = {
	plan_id: "pro" as const,
	name: "Pro",
	description: "For production applications and growing projects.",
	price: {
		amount: 160_000,
		currency: "IDR",
		interval: "month",
	},
	features: [
		"300 API Requests per Minute (RPM)",
		"30-Day Request Logs",
		"Advanced Analytics",
		"Webhooks",
		"Priority Support",
	],
	limits: { max: 300, timeWindow: 60_000 },
	highlighted: true,
} satisfies ApiPlan<true>;

export const BUSINESS_PLAN = {
	plan_id: "business" as const,
	name: "Business",
	description: "For high-volume applications and growing businesses.",
	price: {
		amount: 400_999,
		currency: "IDR",
		interval: "month",
	},
	features: [
		"1K API Requests per Minute (RPM)",
		"90-Day Request Logs",
		"Advanced Analytics",
		"Webhooks",
		"Priority Support",
	],
	limits: { max: 1000, timeWindow: 60_000 },
	highlighted: false,
} satisfies ApiPlan<true>;

export const BILLING_PLANS = [
	FREE_PLAN,
	HOBBY_PLAN,
	PRO_PLAN,
	BUSINESS_PLAN,
] as ApiPlan[];

/**
 * Plan tier ranks for comparing tier upgrades vs downgrades.
 */
export const PLAN_TIER_RANK: Record<string, number> = {
	[FREE_PLAN.plan_id]: 0,
	[HOBBY_PLAN.plan_id]: 1,
	[PRO_PLAN.plan_id]: 2,
	[BUSINESS_PLAN.plan_id]: 3,
};

/**
 * Standard tier monthly rates in Indonesian Rupiah.
 */
export const STANDARD_TIER_RATES: Record<string, number> = {
	[FREE_PLAN.plan_id]: FREE_PLAN.price.amount,
	[HOBBY_PLAN.plan_id]: HOBBY_PLAN.price.amount,
	[PRO_PLAN.plan_id]: PRO_PLAN.price.amount,
	[BUSINESS_PLAN.plan_id]: BUSINESS_PLAN.price.amount,
};

/**
 * Standard tier request-per-minute
 */
export const STANDARD_TIER_RPM: Record<string, number> = {
	[FREE_PLAN.plan_id]: FREE_PLAN.limits.max,
	[HOBBY_PLAN.plan_id]: HOBBY_PLAN.limits.max,
	[PRO_PLAN.plan_id]: PRO_PLAN.limits.max,
	[BUSINESS_PLAN.plan_id]: BUSINESS_PLAN.limits.max,
};

/**
 * Rate limiting rpm
 */
export const RATE_LIMIT = {
	// Free user tier: 10 requests per minute
	[FREE_PLAN.plan_id]: FREE_PLAN.limits,
	// Hobby plan: 60 requests per minute
	[HOBBY_PLAN.plan_id]: HOBBY_PLAN.limits,
	// Pro plan: 300 requests per minute
	[PRO_PLAN.plan_id]: PRO_PLAN.limits,
	// Business plan: 1000 requests per minute
	[BUSINESS_PLAN.plan_id]: BUSINESS_PLAN.limits,
	// Paid tier fallback: HOBBY_PLAN
	paid: HOBBY_PLAN.limits,
} as const satisfies RateLimit;
