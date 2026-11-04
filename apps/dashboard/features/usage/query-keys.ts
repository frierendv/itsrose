/**
 * React Query key factory for the API usage analytics surface.
 */
export const usageQueryKeys = {
	all: ["usage"] as const,
	stats: () => [...usageQueryKeys.all, "stats"] as const,
};
