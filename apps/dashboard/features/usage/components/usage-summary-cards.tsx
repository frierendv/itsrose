"use client";

import {
	CircleCheckFill,
	Clock,
	Speedometer,
	Thunderbolt,
} from "@gravity-ui/icons";
import { useUsageStats } from "../hooks/use-usage-stats";
import {
	DEFAULT_USAGE_WINDOW_DAYS,
	useUsageSummary,
} from "../hooks/use-usage-summary";
import { formatUsageCount } from "../utils";
import { UsageMetricCard } from "./usage-metric-card";

export type UsageSummaryCardsProps = {
	/** Aggregation window in days. */
	days?: number;
};

/**
 * Usage summary grid: window totals, billable volume, mean latency and today's
 * requests. Reads the tenant summary endpoint and keeps the legacy stats call
 * only for the intraday bucket.
 */
export const UsageSummaryCards: React.FC<UsageSummaryCardsProps> = ({
	days = DEFAULT_USAGE_WINDOW_DAYS,
}) => {
	const { summary, isPending: isSummaryPending } = useUsageSummary(days);
	const { stats, isPending: isStatsPending } = useUsageStats();

	const requestsToday =
		stats?.requests_by_day[stats.requests_by_day.length - 1]?.count ?? 0;

	return (
		<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
			<UsageMetricCard
				icon={<Thunderbolt className="size-4" />}
				label="Total Requests"
				value={
					isSummaryPending
						? null
						: formatUsageCount(summary?.total_requests ?? 0)
				}
				hint={`Last ${days} days across all endpoints`}
			/>
			<UsageMetricCard
				icon={<CircleCheckFill className="size-4" />}
				label="Billable Requests"
				value={
					isSummaryPending
						? null
						: formatUsageCount(summary?.requests_ok ?? 0)
				}
				hint="Successful responses (2xx/3xx) only"
			/>
			<UsageMetricCard
				icon={<Speedometer className="size-4" />}
				label="Average Latency"
				value={
					isSummaryPending
						? null
						: `${formatUsageCount(summary?.avg_latency_ms ?? 0)} ms`
				}
				hint="Mean response time"
			/>
			<UsageMetricCard
				icon={<Clock className="size-4" />}
				label="Requests Today"
				value={isStatsPending ? null : formatUsageCount(requestsToday)}
				hint="Since midnight UTC"
			/>
		</div>
	);
};

UsageSummaryCards.displayName = "UsageSummaryCards";
