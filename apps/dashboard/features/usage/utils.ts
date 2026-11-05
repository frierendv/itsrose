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
