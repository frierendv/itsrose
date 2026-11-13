import type { ClientOptions, MidtransClient } from "@itsrose/midtrans";
import type { GenericEndpointContext } from "better-auth";

// Re-export reusable Midtrans typings (headers, signatures, options, ...).
export type * from "@itsrose/midtrans/typings";

/**
 * Well-known plan tiers. Custom plan ids are allowed through the
 * `(string & {})` branch so the catalog can grow without a breaking change.
 */
export type PlanTier = "free" | "hobby" | "pro" | "business";

export type BillingInterval = "month" | "year";

export type PlanPrice = {
	amount: number;
	currency: "IDR";
	interval: BillingInterval;
};

export type PlanLimits = {
	readonly max: number;
	readonly timeWindow: number;
};

export type ApiPlan<OmitId extends boolean = false> = {
	plan_id: PlanTier | (string & {});
	name: string;
	price: PlanPrice;
	description: string | null;
	features: string[];
	limits: PlanLimits;
	/** Monthly billable request allowance; `null` means unlimited. */
	quota_requests: number | null;
	highlighted: boolean;
} & (OmitId extends false ? { id: string } : unknown);

export type RateLimit = {
	readonly [T in ApiPlan["plan_id"]]: PlanLimits;
} & {
	/** Paid tier fallback: `HOBBY_PLAN`, in case something goes wrong. */
	readonly paid: PlanLimits;
};

/* -------------------------------------------------------------------------- */
/*                              Invoices                                      */
/* -------------------------------------------------------------------------- */

export type TransactionInvoiceCustomerDetails = {
	id: string;
	name?: string | null;
	email?: string | null;
	phone?: string | null;
	notes?: string | null;
};

export type TransactionInvoiceItemDetails = {
	item_id: string;
	description?: string | null;
	quantity: number;
	price: number;
	discount_percentage?: number | null;
	discount_amount?: number | string | null;
};

export type InvoiceType = "NEW" | "UPGRADE" | "RENEWAL" | "USAGE";

export type ProrationCycleResetReason =
	"under_24_hours" | "trivial_payable" | "new_subscription";

export type ProrationDetails = {
	current_tier: string;
	target_tier: string;
	current_period_start: string;
	current_period_end: string;
	total_period_ms: number;
	remaining_ms: number;
	current_tier_price: number;
	target_tier_price: number;
	price_difference: number;
	payable_amount: number;
	is_cycle_reset: boolean;
	cycle_reset_reason?: ProrationCycleResetReason;
};

export type TransactionInvoice = {
	id?: string;
	invoice_id: string;
	user_id: string;
	order_id: string;
	invoice_type: InvoiceType;
	target_tier: string;
	status: string;
	invoice_date: string;
	due_date: string;
	invoice_number: string;
	payment_type: string;
	pdf_url?: string | null;
	paid_pdf_url?: string | null;
	paid_date?: string | null;
	gross_amount: number;
	payment_link_url?: string | null;
	customer_details: TransactionInvoiceCustomerDetails | null;
	item_details: TransactionInvoiceItemDetails[] | null;
	proration_details?: ProrationDetails | null;
	created_at?: string | Date;
	updated_at?: string | Date;
};

/**
 * Readable alias of {@link TransactionInvoice}.
 */
export type Invoice = TransactionInvoice;

export type TransactionInvoiceEvent = {
	id?: string;
	event_name: string;
	event_json: Record<string, unknown>;
	created_at?: string | Date;
};

export type InvoiceSequence = {
	id?: string;
	year: number;
	last_val: number;
};

/* -------------------------------------------------------------------------- */
/*                            Subscriptions                                   */
/* -------------------------------------------------------------------------- */

export type TenantKind = "personal" | "organization";

export type Tenant = {
	id: string;
	kind: TenantKind | (string & {});
	name: string;
	owner_user_id: string;
	created_at?: Date | string;
};

export type TenantMember = {
	id: string;
	tenant_id: string;
	user_id: string;
	role: string;
	created_at?: Date | string;
};

export type SubscriptionStatus =
	"active" | "pending_payment" | "past_due" | "expired" | "canceled";

export type Subscription = {
	id: string;
	user_id: string;
	plan_id: PlanTier | string;
	interval?: BillingInterval | null;
	status: SubscriptionStatus;
	period_start: Date | string;
	period_end: Date | string;
	scheduled_tier?: string | null;
	grace_period_end?: Date | string | null;
	cancel_at_period_end?: boolean | null;
	canceled_at?: Date | string | null;
	ended_at?: Date | string | null;
	trial_start?: Date | string | null;
	trial_end?: Date | string | null;
	invoice_id?: string | null;
	order_id?: string | null;
	created_at?: Date | string;
	updated_at?: Date | string;
};

export type UserSubscription = {
	subscription_id?: string;
	has_access: boolean;
	plan: ApiPlan;
	status: SubscriptionStatus;
	period_start: Date | null;
	expires_at: Date | null;
	scheduled_tier?: string | null;
	grace_period_end?: Date | null;
	cancel_at_period_end?: boolean;
	invoice_id?: string;
	order_id?: string;
	rate_limit: {
		max: number;
		timeWindow: number;
	};
};

export type CronExecutionResult = {
	dispatched_renewals: number;
	tracked_grace_periods: number;
	swept_expired: number;
	errors: Array<{ task: string; id?: string; error: string }>;
};

/* -------------------------------------------------------------------------- */
/*                               Plugin options                               */
/* -------------------------------------------------------------------------- */

export interface BillingPluginOptions {
	/**
	 * Midtrans client instance or client configuration options.
	 * If omitted, MidtransClient initializes using environment variables.
	 */
	midtrans?: MidtransClient | ClientOptions;

	/**
	 * Default days before invoice payment expires (default: 3).
	 */
	defaultDueDays?: number;

	/**
	 * Automatically seed default billing plans into the database if the table is empty (default: true).
	 */
	autoSeedPlans?: boolean;

	/**
	 * Custom initial plans to seed. Defaults to the built-in BILLING_PLANS.
	 */
	defaultPlans?: ApiPlan<true>[];

	/**
	 * Hook called when an invoice is successfully generated and stored.
	 */
	onInvoiceCreated?: (
		invoice: TransactionInvoice,
		ctx: GenericEndpointContext
	) => Promise<void> | void;

	/**
	 * Hook called when an invoice status changes to 'paid'.
	 */
	onInvoicePaid?: (
		invoice: TransactionInvoice,
		ctx: GenericEndpointContext
	) => Promise<void> | void;

	/**
	 * Hook called when an invoice is voided.
	 */
	onInvoiceVoided?: (
		invoice: TransactionInvoice,
		ctx: GenericEndpointContext
	) => Promise<void> | void;

	/**
	 * Hook called when a subscription is created or activated.
	 */
	onSubscriptionCreated?: (
		subscription: Subscription,
		ctx: GenericEndpointContext
	) => Promise<void> | void;

	/**
	 * Hook called when a subscription is updated.
	 */
	onSubscriptionUpdated?: (
		subscription: Subscription,
		ctx: GenericEndpointContext
	) => Promise<void> | void;

	/**
	 * Hook called when a subscription is canceled.
	 */
	onSubscriptionCanceled?: (
		subscription: Subscription,
		ctx: GenericEndpointContext
	) => Promise<void> | void;
}

/** @deprecated Use {@link BillingPluginOptions}. */
export type ItsRosePluginOptions = BillingPluginOptions;
