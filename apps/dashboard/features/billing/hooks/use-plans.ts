"use client";

import { withAuthQuery } from "@/lib/api";
import { authClient } from "@/lib/auth";
import { BILLING_PLANS, type ApiPlan } from "@itsrose/auth-billing";
import { useQuery } from "@tanstack/react-query";
import { billingQueryKeys } from "../query-keys";

/**
 * Hook to fetch available billing plans.
 * Falls back to the built-in catalog when the network request fails.
 * Cached under `['billing', 'plans']`.
 */
export function usePlans() {
	const query = useQuery({
		queryKey: billingQueryKeys.plans(),
		// The plan catalog is stable; admin mutations invalidate it explicitly.
		staleTime: 60 * 60_000,
		queryFn: async (): Promise<ApiPlan[]> => {
			try {
				const res = await withAuthQuery(authClient.itsrose.plan.list());
				if (Array.isArray(res) && res.length > 0) {
					return res;
				}
			} catch {
				// Fall back to built-in default plans if network fails
			}
			return BILLING_PLANS;
		},
		initialData: BILLING_PLANS,
	});

	return {
		...query,
		plans: query.data ?? BILLING_PLANS,
	};
}
