"use client";

import { withAuthQuery } from "@/lib/api";
import { authClient } from "@/lib/auth";
import type { TransactionInvoiceEvent } from "@itsrose/auth-billing";
import { useQuery } from "@tanstack/react-query";
import { adminQueryKeys } from "../query-keys";
import type { EventFilters } from "../types";

/**
 * Hook to retrieve system transaction events for audit log inspection.
 */
export function useAdminEvents(filters?: EventFilters) {
	const query = useQuery({
		queryKey: adminQueryKeys.events.list(
			filters as Record<string, unknown>
		),
		queryFn: async (): Promise<TransactionInvoiceEvent[]> => {
			const res = await withAuthQuery(
				authClient.itsrose.payment.listEvents({
					query: {
						event_name:
							filters?.event_name && filters.event_name !== "all"
								? filters.event_name
								: undefined,
						limit: filters?.limit,
						offset: filters?.offset,
					},
				})
			);

			return res ?? [];
		},
	});

	return {
		...query,
		events: query.data ?? [],
	};
}
