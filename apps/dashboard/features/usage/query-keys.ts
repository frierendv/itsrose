/**
 * React Query key factory for the API usage analytics surface.
 */
export type UsageBreakdownKey = "endpoint" | "api_key";

export const usageQueryKeys = {
	all: ["usage"] as const,
	stats: () => [...usageQueryKeys.all, "stats"] as const,
	summary: (days: number) =>
		[...usageQueryKeys.all, "summary", days] as const,
	quota: () => [...usageQueryKeys.all, "quota"] as const,
	timeseries: (days: number) =>
		[...usageQueryKeys.all, "timeseries", days] as const,
	breakdown: (by: UsageBreakdownKey, days: number) =>
		[...usageQueryKeys.all, "breakdown", by, days] as const,
};
