import type {
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
