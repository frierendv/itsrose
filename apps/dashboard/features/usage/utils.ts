/**
 * Formatters and quota derivations for the usage surface.
 *
 * Kept pure so the card components stay declarative and the edge cases
 * (unlimited plans, first period, invalid timestamps) are unit tested.
 */

const numberFormatter = new Intl.NumberFormat("id-ID");

const resetFormatter = new Intl.DateTimeFormat("id-ID", {
	dateStyle: "medium",
	timeZone: "UTC",
});

export type QuotaTone = "success" | "warning" | "danger";

export function formatUsageCount(value: number): string {
	const safe = Number.isFinite(value) ? Math.trunc(value) : 0;
	return numberFormatter.format(Math.max(0, safe));
}

/**
 * Percentage of the monthly allowance already consumed, clamped to `0–100`.
 * Returns `null` for unlimited plans, where a percentage is meaningless.
 */
export function usageRatio(used: number, limit: number | null): number | null {
	if (limit === null || limit <= 0) {
		return null;
	}
	const safeUsed = Number.isFinite(used) ? Math.max(0, used) : 0;
	return Math.min(100, Math.max(0, (safeUsed / limit) * 100));
}

/**
 * Progress tone: green while comfortable, amber from 70%, red from 90%.
 */
export function quotaTone(ratio: number | null): QuotaTone {
	if (ratio === null) {
		return "success";
	}
	if (ratio >= 90) {
		return "danger";
	}
	if (ratio >= 70) {
		return "warning";
	}
	return "success";
}

export function formatQuotaLimit(limit: number | null): string {
	return limit === null
		? "Unlimited monthly requests"
		: `${formatUsageCount(limit)} requests per month`;
}

export function formatQuotaRemaining(remaining: number | null): string {
	return remaining === null
		? "No monthly cap on your plan"
		: `${formatUsageCount(remaining)} requests remaining`;
}

/**
 * Formats the quota reset timestamp (first instant of the next period, UTC).
 */
export function formatQuotaReset(resetAt: string | null | undefined): string {
	if (!resetAt) {
		return "—";
	}
	const date = new Date(resetAt);
	if (Number.isNaN(date.getTime())) {
		return "—";
	}
	return resetFormatter.format(date);
}

export type QuotaCardModel = {
	is_unlimited: boolean;
	used_label: string;
	limit_label: string;
	remaining_label: string;
	reset_label: string;
	percent_label: string | null;
	ratio: number | null;
	tone: QuotaTone;
	mode_label: string;
	copy: string;
};

/**
 * Builds every string and tone the quota card renders.
 *
 * Extracted from the component so the presentation rules (unlimited plans,
 * percentage clamping, reset formatting, soft vs hard wording) are unit tested
 * without mounting HeroUI's ESM component graph.
 */
export function quotaCardModel(quota: {
	used: number;
	limit: number | null;
	remaining: number | null;
	reset_at: string;
	mode: string;
}): QuotaCardModel {
	const ratio = usageRatio(quota.used, quota.limit);
	const tone = quotaTone(ratio);
	const isUnlimited = quota.limit === null;

	return {
		is_unlimited: isUnlimited,
		used_label: formatUsageCount(quota.used),
		limit_label: isUnlimited
			? "Unlimited"
			: `of ${formatUsageCount(quota.limit ?? 0)} requests`,
		remaining_label: formatQuotaRemaining(quota.remaining),
		reset_label: `Resets ${formatQuotaReset(quota.reset_at)}`,
		percent_label: isUnlimited ? null : `${Math.round(ratio ?? 0)}% used`,
		ratio,
		tone,
		mode_label: quota.mode === "hard" ? "Hard limit" : "Soft limit",
		copy: isUnlimited
			? "Your plan has no monthly request cap. Usage is still metered for analytics and invoicing."
			: quota.mode === "hard"
				? "Requests are rejected once the allowance is exhausted."
				: "Usage above the allowance is reported, not blocked.",
	};
}

/* -------------------------------------------------------------------------- */
/*                              Trend model                                   */
/* -------------------------------------------------------------------------- */

const dayLabelFormatter = new Intl.DateTimeFormat("id-ID", {
	weekday: "short",
	day: "numeric",
	timeZone: "UTC",
});

export type TrendBar = {
	date: string;
	/** Short weekday + day, e.g. `Kam 5`. */
	label: string;
	total_count: number;
	billable_count: number;
	/** Height of the total bar, 0–100. */
	total_pct: number;
	/** Height of the billable bar, 0–100. */
	billable_pct: number;
	tooltip: string;
};

export type TrendCardModel = {
	bars: TrendBar[];
	total_requests: number;
	billable_requests: number;
	total_label: string;
	billable_label: string;
	peak_label: string | null;
	is_empty: boolean;
};

/**
 * Normalizes the daily points into bar heights.
 *
 * Heights are relative to the busiest day so a quiet week still reads as a
 * shape instead of seven invisible slivers.
 */
export function trendCardModel(
	points:
		| readonly {
				date: string;
				requests_total: number;
				requests_ok: number;
		  }[]
		| null
		| undefined
): TrendCardModel {
	const safePoints = points ?? [];
	const totals = safePoints.map((point) =>
		Math.max(0, Math.trunc(point.requests_total || 0))
	);
	const billable = safePoints.map((point) =>
		Math.max(0, Math.trunc(point.requests_ok || 0))
	);
	const peak = totals.reduce((max, value) => Math.max(max, value), 0);

	const bars: TrendBar[] = safePoints.map((point, index) => {
		const total = totals[index] ?? 0;
		const ok = Math.min(billable[index] ?? 0, total);
		const label = formatTrendLabel(point.date);
		return {
			date: point.date,
			label,
			total_count: total,
			billable_count: ok,
			total_pct: peak > 0 ? (total / peak) * 100 : 0,
			billable_pct: peak > 0 ? (ok / peak) * 100 : 0,
			tooltip: `${formatUsageCount(total)} requests · ${formatUsageCount(ok)} billable`,
		};
	});

	const totalRequests = totals.reduce((sum, value) => sum + value, 0);
	const billableRequests = billable.reduce((sum, value) => sum + value, 0);

	return {
		bars,
		total_requests: totalRequests,
		billable_requests: billableRequests,
		total_label: `${formatUsageCount(totalRequests)} requests`,
		billable_label: `${formatUsageCount(billableRequests)} billable`,
		peak_label:
			totalRequests > 0
				? (bars.find((bar) => bar.total_count === peak)?.label ?? null)
				: null,
		is_empty: totalRequests === 0,
	};
}

function formatTrendLabel(date: string): string {
	const parsed = new Date(`${date}T00:00:00.000Z`);
	if (Number.isNaN(parsed.getTime())) {
		return date;
	}
	return dayLabelFormatter.format(parsed);
}

/* -------------------------------------------------------------------------- */
/*                            Breakdown model                                 */
/* -------------------------------------------------------------------------- */

export type EndpointSliceModel = {
	key: string;
	requests_ok: number;
	total_requests: number;
	share_pct: number;
	count_label: string;
	share_label: string;
	/** Bar width relative to the busiest endpoint, 0–100. */
	width_pct: number;
};

export type BreakdownCardModel = {
	slices: EndpointSliceModel[];
	total_requests: number;
	total_label: string;
	hidden_count: number;
	is_empty: boolean;
};

/**
 * Builds the top-N endpoint leaderboard from the breakdown endpoint.
 *
 * Shares are computed against every returned slice, not just the visible ones,
 * so the percentages still add up to the tenant total.
 */
export function endpointBreakdownModel(
	input: readonly { key: string; requests_ok: number }[] | null | undefined,
	limit = 5
): BreakdownCardModel {
	const safeLimit = Math.max(1, Math.trunc(limit));
	const sorted = [...(input ?? [])]
		.map((slice) => ({
			key: slice.key || "(unknown)",
			requests_ok: Math.max(0, Math.trunc(slice.requests_ok || 0)),
		}))
		.sort((left, right) => {
			if (right.requests_ok !== left.requests_ok) {
				return right.requests_ok - left.requests_ok;
			}
			return left.key.localeCompare(right.key);
		});

	const total = sorted.reduce((sum, slice) => sum + slice.requests_ok, 0);
	const peak = sorted[0]?.requests_ok ?? 0;
	const visible = sorted.slice(0, safeLimit);

	const slices: EndpointSliceModel[] = visible.map((slice) => {
		const share = total > 0 ? (slice.requests_ok / total) * 100 : 0;
		return {
			key: slice.key,
			requests_ok: slice.requests_ok,
			total_requests: total,
			share_pct: share,
			count_label: formatUsageCount(slice.requests_ok),
			share_label: `${Math.round(share)}%`,
			width_pct: peak > 0 ? (slice.requests_ok / peak) * 100 : 0,
		};
	});

	return {
		slices,
		total_requests: total,
		total_label: `${formatUsageCount(total)} requests`,
		hidden_count: Math.max(0, sorted.length - slices.length),
		is_empty: total === 0,
	};
}

/**
 * `YYYY-MM` -> `MMMM YYYY` in the dashboard locale.
 */
export function formatUsagePeriod(period: string | null | undefined): string {
	if (!period) {
		return "—";
	}
	const date = new Date(`${period}-01T00:00:00.000Z`);
	if (Number.isNaN(date.getTime())) {
		return period;
	}
	return new Intl.DateTimeFormat("id-ID", {
		month: "long",
		year: "numeric",
		timeZone: "UTC",
	}).format(date);
}
