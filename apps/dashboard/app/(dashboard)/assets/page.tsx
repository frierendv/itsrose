import { AssetsPage } from "@/features/assets";
import { prefetchAssetsQueries } from "@/lib/api/prefetch";
import { getQueryClient } from "@/lib/query-client";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
	title: "Asset Library",
	description:
		"Upload durable files, open them through short-lived signed links, and delete them to free storage.",
};

/** Server prefetch reads per-request headers; render as a blocking route. */
export const instant = false;

export default async function Assets() {
	const queryClient = getQueryClient();
	await prefetchAssetsQueries(queryClient);

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<Suspense fallback={null}>
				<AssetsPage />
			</Suspense>
		</HydrationBoundary>
	);
}
