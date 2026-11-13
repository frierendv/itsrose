import type {
	ApiPlan,
	CronExecutionResult,
	Invoice,
	Subscription,
	TransactionInvoiceEvent,
} from "@itsrose/auth-billing";
import type {
	FlushUsageResult,
	SettlementResult,
	SettlementTenantResult,
	UsageUnitRate,
} from "@itsrose/auth-usage";
import { formatIDR, formatUnitsMicro } from "./utils";

/* -------------------------------------------------------------------------- */
/*                                  Rates                                     */
/* -------------------------------------------------------------------------- */

export type RateGroup = {
	plan_tier: string;
	/** Current (open) version, if any. */
	open_rate: UsageUnitRate | null;
	/** All versions for the tier, newest first. */
	history: UsageUnitRate[];
	/** Two open rows means the data is inconsistent; surface it. */
	has_conflict: boolean;
};

/**
 * Groups rate versions by tier and flags inconsistent open rows.
 */
export function buildRateGroups(rates: readonly UsageUnitRate[]): RateGroup[] {
	const byTier = new Map<string, UsageUnitRate[]>();

	for (const rate of rates) {
		const tier = rate.plan_tier || "unknown";
		const existing = byTier.get(tier) ?? [];
		existing.push(rate);
		byTier.set(tier, existing);
	}

	return [...byTier.entries()]
		.map(([plan_tier, versions]) => {
			const sorted = [...versions].sort(
				(left, right) => right.rates_version - left.rates_version
			);
			const open = sorted.filter((rate) => !rate.effective_to);
			return {
				plan_tier,
				open_rate: open.length > 0 ? (open[0] ?? null) : null,
				history: sorted,
				has_conflict: open.length > 1,
			};
		})
		.sort((left, right) => left.plan_tier.localeCompare(right.plan_tier));
}

/* -------------------------------------------------------------------------- */
/*                               Settlements                                  */
/* -------------------------------------------------------------------------- */

export type SettlementSummary = {
	period: string;
	unit: string;
	tenant_count: number;
	units_label: string;
	amount_label: string;
	invoices_created: number;
	skipped: number;
	failed: number;
	/** Tenant rows that were skipped or failed. */
	problems: Array<{
		tenant_id: string;
		status: SettlementTenantResult["status"];
		reason: string | null;
	}>;
	is_clean: boolean;
};

/**
 * Turns a settlement run result into display labels and a problem list.
 */
export function buildSettlementSummary(
	result: SettlementResult
): SettlementSummary {
	const problems = result.tenants
		.filter((tenant) => tenant.status !== "settled")
		.map((tenant) => ({
			tenant_id: tenant.tenant_id,
			status: tenant.status,
			reason: tenant.reason ?? null,
		}));

	return {
		period: result.period,
		unit: result.unit,
		tenant_count: result.totals.tenants,
		units_label: formatUnitsMicro(result.totals.units_micro),
		amount_label: formatIDR(result.totals.amount),
		invoices_created: result.totals.invoices_created,
		skipped: result.totals.skipped,
		failed: result.totals.failed,
		problems,
		is_clean: problems.length === 0,
	};
}

/* -------------------------------------------------------------------------- */
/*                                Periods                                     */
/* -------------------------------------------------------------------------- */

export type MonthOption = { id: string; label: string };

const monthFormatter = new Intl.DateTimeFormat("id-ID", {
	month: "long",
	year: "numeric",
	timeZone: "UTC",
});

function pad(value: number): string {
	return String(value).padStart(2, "0");
}

/**
 * Recent UTC months, newest first, for period pickers.
 */
export function buildMonthOptions(
	now: Date = new Date(),
	count = 6
): MonthOption[] {
	const safeCount = Math.max(1, Math.trunc(count));
	return Array.from({ length: safeCount }, (_, index) => {
		const date = new Date(
			Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - index, 1)
		);
		const id = `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}`;
		return { id, label: monthFormatter.format(date) };
	});
}

/* -------------------------------------------------------------------------- */
/*                              Operations                                    */
/* -------------------------------------------------------------------------- */

export type OperationOutcome = {
	fields: Array<{ label: string; value: string }>;
	errors: string[];
};

export function buildFlushOutcome(result: FlushUsageResult): OperationOutcome {
	return {
		fields: [
			{ label: "Days", value: result.days.join(", ") || "—" },
			{ label: "Tenants", value: String(result.tenants) },
			{ label: "Rows read", value: String(result.rows) },
			{ label: "Rows written", value: String(result.written) },
		],
		errors: [],
	};
}

export function buildTenantSyncOutcome(result: {
	scanned: number;
	created: number;
}): OperationOutcome {
	return {
		fields: [
			{ label: "Users scanned", value: String(result.scanned) },
			{ label: "Tenants created", value: String(result.created) },
		],
		errors: [],
	};
}

export function buildCronOutcome(
	result: CronExecutionResult
): OperationOutcome {
	return {
		fields: [
			{
				label: "Renewals dispatched",
				value: String(result.dispatched_renewals ?? 0),
			},
			{
				label: "Grace periods tracked",
				value: String(result.tracked_grace_periods ?? 0),
			},
			{
				label: "Expired swept",
				value: String(result.swept_expired ?? 0),
			},
		],
		errors: (result.errors ?? []).map(
			(error) =>
				`${error.task}${error.id ? ` (${error.id})` : ""}: ${error.error}`
		),
	};
}

/* -------------------------------------------------------------------------- */
/*                                 Overview                                   */
/* -------------------------------------------------------------------------- */

export type OverviewAttentionItem = {
	id: string;
	user_id: string;
	plan_id: string;
	status: string;
	period_end: Date | string | null;
};

export type OverviewMetrics = {
	active_subscriptions: number;
	total_subscriptions: number;
	/** Monthly-normalised MRR in IDR. */
	mrr: number;
	mrr_label: string;
	pending_invoices: number;
	pending_amount: number;
	pending_amount_label: string;
	lifetime_revenue: number;
	lifetime_revenue_label: string;
	attention_count: number;
	attention: OverviewAttentionItem[];
	recent_events: TransactionInvoiceEvent[];
	sampled: {
		subscriptions: number;
		invoices: number;
		cap: number;
		truncated: boolean;
	};
};

export type OverviewMetricsInput = {
	subscriptions: readonly Subscription[];
	invoices: readonly Invoice[];
	plans: readonly ApiPlan[];
	events: readonly TransactionInvoiceEvent[];
	/** Server-side list cap used for the fetch; shown to avoid implying totals. */
	cap?: number;
};

function monthlyPrice(plan: ApiPlan | undefined): number {
	if (!plan) {
		return 0;
	}
	const amount = plan.price?.amount ?? 0;
	return plan.price?.interval === "year" ? amount / 12 : amount;
}

/**
 * KPI, attention and activity model for the command center.
 *
 * Totals are computed from the latest fetched page of records, so the caller
 * renders the sampling caption; the shape is what an accurate aggregate
 * endpoint will return later.
 */
export function buildOverviewMetrics(
	input: OverviewMetricsInput
): OverviewMetrics {
	const cap = input.cap ?? 100;
	const planById = new Map(
		input.plans.map((plan) => [plan.plan_id.toLowerCase(), plan])
	);

	const active = input.subscriptions.filter(
		(subscription) => (subscription.status || "").toLowerCase() === "active"
	);
	const attentionStatuses = new Set(["past_due", "expired"]);
	const attention = input.subscriptions
		.filter((subscription) =>
			attentionStatuses.has((subscription.status || "").toLowerCase())
		)
		.map((subscription) => ({
			id: subscription.id,
			user_id: subscription.user_id,
			plan_id: subscription.plan_id,
			status: subscription.status,
			period_end: subscription.period_end ?? null,
		}))
		.sort(
			(left, right) =>
				new Date(left.period_end ?? 0).getTime() -
				new Date(right.period_end ?? 0).getTime()
		);

	// The invoice status is already in the domain vocabulary: the billing
	// package translates the provider status before it reaches the client, so
	// no provider spelling is compensated for here.
	const pendingInvoices = input.invoices.filter(
		(invoice) => invoice.status === "pending"
	);
	const paidInvoices = input.invoices.filter(
		(invoice) => invoice.status === "paid"
	);

	const mrr = Math.round(
		active.reduce(
			(total, subscription) =>
				total +
				monthlyPrice(
					planById.get((subscription.plan_id || "").toLowerCase())
				),
			0
		)
	);
	const pendingAmount = pendingInvoices.reduce(
		(total, invoice) => total + (invoice.gross_amount ?? 0),
		0
	);
	const lifetimeRevenue = paidInvoices.reduce(
		(total, invoice) => total + (invoice.gross_amount ?? 0),
		0
	);

	return {
		active_subscriptions: active.length,
		total_subscriptions: input.subscriptions.length,
		mrr,
		mrr_label: formatIDR(mrr),
		pending_invoices: pendingInvoices.length,
		pending_amount: pendingAmount,
		pending_amount_label: formatIDR(pendingAmount),
		lifetime_revenue: lifetimeRevenue,
		lifetime_revenue_label: formatIDR(lifetimeRevenue),
		attention_count: attention.length,
		attention: attention.slice(0, 5),
		recent_events: [...input.events].slice(0, 8),
		sampled: {
			subscriptions: input.subscriptions.length,
			invoices: input.invoices.length,
			cap,
			truncated:
				input.subscriptions.length >= cap ||
				input.invoices.length >= cap,
		},
	};
}
