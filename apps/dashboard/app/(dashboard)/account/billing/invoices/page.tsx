import { InvoicesPage } from "@/features/billing";
import { prefetchBillingQueries } from "@/lib/api/prefetch";
import { getQueryClient } from "@/lib/query-client";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
	title: "Invoices & Receipts - Billing",
	description:
		"Review your account transaction history, complete pending payments, and download official billing invoices.",
};

/** Server prefetch reads per-request headers; render as a blocking route. */
export const instant = false;

export default async function Invoices() {
	const queryClient = getQueryClient();
	await prefetchBillingQueries(queryClient);

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<Suspense fallback={null}>
				<InvoicesPage />
			</Suspense>
		</HydrationBoundary>
	);
}
