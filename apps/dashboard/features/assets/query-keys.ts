/**
 * React Query key factory for the asset library.
 *
 * Every list key lives under `assetQueryKeys.all`, so an upload or a delete
 * invalidates each paginated list with one prefix.
 */
export const assetQueryKeys = {
	all: ["assets"] as const,
	lists: () => [...assetQueryKeys.all, "list"] as const,
	list: (params: { limit: number; offset: number }) =>
		[...assetQueryKeys.lists(), params.limit, params.offset] as const,
};
