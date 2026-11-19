import { listAssets } from "@/features/assets/api";
import { ASSETS_PAGE_SIZE } from "@/features/assets/constants";
import { assetQueryKeys } from "@/features/assets/query-keys";
import { billingQueryKeys } from "@/features/billing/query-keys";
import { authClient } from "@/lib/auth";
import {
	noop,
	type DefaultError,
	type QueryClient,
	type QueryExecuteOptions,
	type QueryKey,
} from "@tanstack/react-query";
import { headers } from "next/headers";
import { withAuthQuery } from "./with-auth-query";

function createPrefetchQueryFn(queryClient: QueryClient) {
	return <
		TQueryFnData,
		TError = DefaultError,
		TData = TQueryFnData,
		TQueryData = TQueryFnData,
		TQueryKey extends QueryKey = QueryKey,
		TPageParam = never,
	>(
		options: QueryExecuteOptions<
			TQueryFnData,
			TError,
			TData,
			TQueryData,
			TQueryKey,
			TPageParam
		>
	) => queryClient.query(options).then(noop).catch(noop);
}

/**
 * Prefetches the customer billing surface server-side so pages hydrate with
 * data instead of skeleton flashes. Failures are ignored — the client hooks
 * then fetch normally.
 */
export async function prefetchBillingQueries(
	queryClient: QueryClient
): Promise<void> {
	const fetchOptions = { headers: await headers() };

	const prefetchQuery = createPrefetchQueryFn(queryClient);

	const results = await Promise.allSettled([
		prefetchQuery({
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
		prefetchQuery({
			queryKey: billingQueryKeys.plans(),
			queryFn: () =>
				withAuthQuery(authClient.itsrose.plan.list({ fetchOptions })),
			staleTime: 60 * 60_000,
		}),
		prefetchQuery({
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

/**
 * Prefetches the first page of the asset library server-side.
 *
 * The asset routes live on the API origin, not on the dashboard's own Better
 * Auth proxy, so the incoming `cookie` header is forwarded explicitly — the
 * same way `proxy.ts` forwards `headers()` into the session lookup.
 */
export async function prefetchAssetsQueries(
	queryClient: QueryClient
): Promise<void> {
	const requestHeaders = await headers();
	const prefetchQuery = createPrefetchQueryFn(queryClient);

	const results = await Promise.allSettled([
		prefetchQuery({
			queryKey: assetQueryKeys.list({
				limit: ASSETS_PAGE_SIZE,
				offset: 0,
			}),
			queryFn: () =>
				listAssets(
					{ limit: ASSETS_PAGE_SIZE, offset: 0 },
					{ headers: requestHeaders }
				),
			staleTime: 30_000,
		}),
	]);

	void results;
}
