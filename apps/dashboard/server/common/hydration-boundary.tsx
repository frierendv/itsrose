import { getQueryClient } from "@/shared/lib";
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
