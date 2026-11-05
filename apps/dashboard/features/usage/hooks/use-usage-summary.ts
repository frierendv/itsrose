"use client";

import { withAuthQuery } from "@/lib/api";
import { authClient } from "@/lib/auth";
import type { UsageWindowSummary } from "@itsrose/auth-usage";
import { useQuery } from "@tanstack/react-query";
import { usageQueryKeys } from "../query-keys";

export const DEFAULT_USAGE_WINDOW_DAYS = 30;

/**
 * Window summary for the current tenant: total and billable requests plus the
 * mean latency. Cached under `['usage', 'summary', days]`.
 */
export function useUsageSummary(days: number = DEFAULT_USAGE_WINDOW_DAYS) {
	const query = useQuery({
		queryKey: usageQueryKeys.summary(days),
		// Counters aggregate on the API side; refresh once a minute.
		staleTime: 60_000,
		queryFn: async (): Promise<UsageWindowSummary | null> => {
			const res = await withAuthQuery(
				authClient.usage.summary({ query: { days } })
			);
			return res ?? null;
		},
	});

	return {
		...query,
		summary: query.data ?? null,
	};
}
