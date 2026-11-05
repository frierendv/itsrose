"use client";

import { withAuthQuery } from "@/lib/api";
import { authClient } from "@/lib/auth";
import type { UsageQuotaSnapshot } from "@itsrose/auth-usage";
import { useQuery } from "@tanstack/react-query";
import { usageQueryKeys } from "../query-keys";

/**
 * Current period quota state. Refreshed more aggressively than the analytics
 * because it drives the consumer-facing limit signal.
 */
export function useUsageQuota() {
	const query = useQuery({
		queryKey: usageQueryKeys.quota(),
		staleTime: 30_000,
		queryFn: async (): Promise<UsageQuotaSnapshot | null> => {
			const res = await withAuthQuery(authClient.usage.quota());
			return res ?? null;
		},
	});

	return {
		...query,
		quota: query.data ?? null,
	};
}
