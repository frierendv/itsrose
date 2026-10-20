import { getQueryClient } from "@/client/query";
import {
	dehydrate,
	HydrationBoundary as ReactQueryHydrationBoundary,
	type HydrationBoundaryProps,
} from "@tanstack/react-query";

export const HydrationBoundary = async (
	props: Omit<HydrationBoundaryProps, "state">
) => {
	const queryClient = getQueryClient();
	return (
		<ReactQueryHydrationBoundary
			state={dehydrate(queryClient)}
			{...props}
		/>
	);
};
