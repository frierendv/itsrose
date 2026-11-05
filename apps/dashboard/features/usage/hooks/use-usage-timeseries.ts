"use client";

import { withAuthQuery } from "@/lib/api";
import { authClient } from "@/lib/auth";
import type { UsageTimeseriesPoint } from "@itsrose/auth-usage";
import { useQuery } from "@tanstack/react-query";
import { usageQueryKeys } from "../query-keys";

export const DEFAULT_TREND_DAYS = 7;

/**
 * Daily request buckets for the current tenant.
 * Cached under `['usage', 'timeseries', days]`.
 */
export function useUsageTimeseries(days: number = DEFAULT_TREND_DAYS) {
	const query = useQuery({
		queryKey: usageQueryKeys.timeseries(days),
		staleTime: 60_000,
		queryFn: async (): Promise<UsageTimeseriesPoint[]> => {
			const res = await withAuthQuery(
				authClient.usage.timeseries({ query: { days } })
			);
			return res?.points ?? [];
		},
	});

	return {
		...query,
		points: query.data ?? [],
	};
}
