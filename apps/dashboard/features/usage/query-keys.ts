/**
 * React Query key factory for the API usage analytics surface.
 */
export const usageQueryKeys = {
	all: ["usage"] as const,
	stats: () => [...usageQueryKeys.all, "stats"] as const,
	summary: (days: number) =>
		[...usageQueryKeys.all, "summary", days] as const,
	quota: () => [...usageQueryKeys.all, "quota"] as const,
};
