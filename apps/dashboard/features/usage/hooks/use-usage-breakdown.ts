"use client";

import { withAuthQuery } from "@/lib/api";
import { authClient } from "@/lib/auth";
import type { UsageBreakdownSlice } from "@itsrose/auth-usage";
import { useQuery } from "@tanstack/react-query";
import { usageQueryKeys, type UsageBreakdownKey } from "../query-keys";

export const DEFAULT_BREAKDOWN_DAYS = 7;

/**
 * Successful-request breakdown by endpoint (or API key) for the window.
 * Cached under `['usage', 'breakdown', by, days]`.
 */
export function useUsageBreakdown(
	by: UsageBreakdownKey = "endpoint",
	days: number = DEFAULT_BREAKDOWN_DAYS
) {
	const query = useQuery({
		queryKey: usageQueryKeys.breakdown(by, days),
		staleTime: 60_000,
		queryFn: async (): Promise<UsageBreakdownSlice[]> => {
			const res = await withAuthQuery(
				authClient.usage.breakdown({ query: { by, days } })
			);
			return res?.slices ?? [];
		},
	});

	return {
		...query,
		slices: query.data ?? [],
	};
}
