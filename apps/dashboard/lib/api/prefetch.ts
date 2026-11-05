import { billingQueryKeys } from "@/features/billing/query-keys";
import { authClient } from "@/lib/auth";
import type { QueryClient } from "@tanstack/react-query";
import { headers } from "next/headers";
import { withAuthQuery } from "./with-auth-query";

/**
 * Prefetches the customer billing surface server-side so pages hydrate with
 * data instead of skeleton flashes. Failures are ignored — the client hooks
 * then fetch normally.
 */
export async function prefetchBillingQueries(
	queryClient: QueryClient
): Promise<void> {
	const fetchOptions = { headers: await headers() };

	const results = await Promise.allSettled([
		queryClient.prefetchQuery({
			queryKey: billingQueryKeys.subscription(),
			queryFn: () =>
				withAuthQuery(
					authClient.itsrose.subscription.get({
						query: {},
						fetchOptions,
					})
				),
			staleTime: 30_000,
		}),
		queryClient.prefetchQuery({
			queryKey: billingQueryKeys.plans(),
			queryFn: () =>
				withAuthQuery(authClient.itsrose.plan.list({ fetchOptions })),
			staleTime: 60 * 60_000,
		}),
		queryClient.prefetchQuery({
			queryKey: billingQueryKeys.invoices(),
			queryFn: () =>
				withAuthQuery(
					authClient.itsrose.payment.listInvoice({
						query: {},
						fetchOptions,
					})
				),
			staleTime: 30_000,
		}),
	]);

	// Prefetch failures are non-fatal: the corresponding queries stay
	// unpopulated and the client hooks fetch them on mount.
	void results;
}
