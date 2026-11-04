import { BillingPage } from "@/features/billing";
import { prefetchBillingQueries } from "@/lib/api/prefetch";
import { getQueryClient } from "@/lib/query-client";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
	title: "Billing & Subscription",
	description:
		"Manage your active subscription plan, payment methods, billing schedule, and invoices.",
};

/** Server prefetch reads per-request headers; render as a blocking route. */
export const instant = false;

export default async function Billing() {
	const queryClient = getQueryClient();
	await prefetchBillingQueries(queryClient);

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<Suspense fallback={null}>
				<BillingPage />
			</Suspense>
		</HydrationBoundary>
	);
}
