"use client";

import { withAuthQuery } from "@/lib/api";
import { authClient } from "@/lib/auth";
import type { Subscription } from "@itsrose/auth-billing";
import { useQuery } from "@tanstack/react-query";
import { billingQueryKeys } from "../query-keys";

/**
 * Hook to retrieve the current authenticated user's subscription.
 * Cached under `['billing', 'subscription']`.
 */
export function useSubscription() {
	const query = useQuery({
		queryKey: billingQueryKeys.subscription(),
		// Billing state changes via user actions and webhooks; keep fresh.
		staleTime: 30_000,
		queryFn: async (): Promise<Subscription | null> => {
			const res = await withAuthQuery(
				authClient.itsrose.subscription.get({ query: {} })
			);
			return res ?? null;
		},
	});

	return {
		...query,
		subscription: query.data ?? null,
	};
}
