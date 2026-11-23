import { SpeechPage } from "@/features/speech";
import { prefetchSpeechQueries } from "@/lib/api/prefetch";
import { getQueryClient } from "@/lib/query-client";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
	title: "Speech",
	description:
		"Write a script, choose a voice, and generate speech. Preview voices, replay recent generations, and save the ones worth keeping.",
};

/** Server prefetch reads per-request headers; render as a blocking route. */
export const instant = false;

export default async function Speech() {
	const queryClient = getQueryClient();
	await prefetchSpeechQueries(queryClient);

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<Suspense fallback={null}>
				<SpeechPage />
			</Suspense>
		</HydrationBoundary>
	);
}
