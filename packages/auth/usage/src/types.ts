/**
 * Single day request bucket.
 */
export type UsageDayCount = {
	/** ISO date (`YYYY-MM-DD`, UTC). */
	date: string;
	count: number;
};

/**
 * Aggregated API usage statistics for a single user.
 *
 * All fields are `snake_case` per the monorepo API convention.
 */
export type UsageStats = {
	/** Total authenticated requests in the aggregation window. */
	total_requests: number;
	/** Mean response latency in milliseconds. */
	avg_latency_ms: number;
	/** Daily request counts, oldest first. */
	requests_by_day: UsageDayCount[];
};

/**
 * Port implemented by the host application to read usage counters.
 */
export type UsageStatsPort = {
	getStats: (userId: string) => Promise<UsageStats>;
};
