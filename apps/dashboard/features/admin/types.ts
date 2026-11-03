import type {
	ApiPlan,
	BillingInterval,
	CronExecutionResult,
	Invoice,
	InvoiceType,
	PlanLimits,
	PlanPrice,
	PlanTier,
	ProrationDetails,
	Subscription,
	SubscriptionStatus,
	TransactionInvoice,
	TransactionInvoiceEvent,
	UserSubscription,
} from "@itsrose/auth-billing";

export type {
	ApiPlan,
	BillingInterval,
	CronExecutionResult,
	Invoice,
	InvoiceType,
	PlanLimits,
	PlanPrice,
	PlanTier,
	ProrationDetails,
	Subscription,
	SubscriptionStatus,
	TransactionInvoice,
	TransactionInvoiceEvent,
	UserSubscription,
};

export interface CreatePlanInput {
	plan_id: string;
	name: string;
	description?: string;
	price_amount: number;
	interval?: "month" | "year";
	rate_limit_max?: number;
	rate_limit_window?: number;
	features?: string[];
	highlighted?: boolean;
}

export interface UpdatePlanInput {
	plan_id: string;
	name?: string;
	description?: string;
	price_amount?: number;
	interval?: "month" | "year";
	rate_limit_max?: number;
	rate_limit_window?: number;
	features?: string[];
	highlighted?: boolean;
	seatBased?: boolean;
}

export interface UpdateSubscriptionInput {
	subscription_id?: string;
	userId?: string;
	plan_id?: string;
	interval?: BillingInterval;
	status?: SubscriptionStatus;
	period_start?: string;
	period_end?: string;
	scheduled_tier?: string | null;
	cancel_at_period_end?: boolean;
}

export interface SubscriptionFilters {
	userId?: string;
	status?: string;
	limit?: number;
	offset?: number;
	search?: string;
}

export interface InvoiceFilters {
	userId?: string;
	status?: string;
	invoice_type?: string;
	limit?: number;
	offset?: number;
	search?: string;
}

export interface VoidInvoiceInput {
	invoice_id: string;
	reason?: string;
}

export interface BillingCronInput {
	secret?: string;
	lead_days?: number;
	grace_days?: number;
}

export interface EventFilters {
	limit?: number;
	offset?: number;
	event_name?: string;
	search?: string;
}
