"use client";

import { withAuthQuery } from "@/lib/api";
import { authClient } from "@/lib/auth";
import type { UsageStats } from "@itsrose/auth-usage";
import { useQuery } from "@tanstack/react-query";
import { usageQueryKeys } from "../query-keys";

/**
 * Hook to retrieve the current user's API usage statistics.
 * Cached under `['usage', 'stats']`.
 */
export function useUsageStats() {
	const query = useQuery({
		queryKey: usageQueryKeys.stats(),
		// Usage counters aggregate on the API side; refresh once a minute.
		staleTime: 60_000,
		queryFn: async (): Promise<UsageStats | null> => {
			const res = await withAuthQuery(authClient.usage.stats());
			return res ?? null;
		},
	});

	return {
		...query,
		stats: query.data ?? null,
	};
}

const numberFormatter = new Intl.NumberFormat("id-ID");

export function formatUsageCount(value: number): string {
	return numberFormatter.format(value || 0);
}
