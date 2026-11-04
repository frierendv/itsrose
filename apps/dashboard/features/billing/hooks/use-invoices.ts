"use client";

import { withAuthQuery } from "@/lib/api";
import { authClient } from "@/lib/auth";
import type { Invoice } from "@itsrose/auth-billing";
import { useQuery } from "@tanstack/react-query";
import { billingQueryKeys } from "../query-keys";

/**
 * Hook to retrieve invoices for the authenticated user.
 * Cached under `['billing', 'invoices', status]`.
 */
export function useInvoices(options?: { status?: string }) {
	const query = useQuery({
		queryKey: billingQueryKeys.invoices(options?.status),
		// Invoices change on payment settlement; keep fresh without hammering.
		staleTime: 30_000,
		queryFn: async (): Promise<Invoice[]> => {
			const res = await withAuthQuery(
				authClient.itsrose.payment.listInvoice({
					query: options?.status
						? { status: options.status }
						: undefined,
				})
			);
			return res ?? [];
		},
	});

	return {
		...query,
		invoices: query.data ?? [],
	};
}
