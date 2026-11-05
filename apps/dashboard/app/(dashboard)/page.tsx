import { HomePage } from "@/features/home";
import { prefetchBillingQueries } from "@/lib/api/prefetch";
import { getQueryClient } from "@/lib/query-client";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
	title: "Home",
};

/** Server prefetch reads per-request headers; render as a blocking route. */
export const instant = false;

export default async function DashboardHomePage() {
	const queryClient = getQueryClient();
	await prefetchBillingQueries(queryClient);

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<Suspense fallback={null}>
				<HomePage />
			</Suspense>
		</HydrationBoundary>
	);
}
