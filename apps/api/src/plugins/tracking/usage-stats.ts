import {
	USAGE_COUNTER_TTL_SECONDS,
	USAGE_DAILY_BUCKETS,
	USAGE_WINDOW_DAYS,
} from "@itsrose/auth-usage";
import type { UsageStats, UsageStatsPort } from "@itsrose/auth-usage";
import type { Redis } from "ioredis";

/**
 * Redis key layout for the daily usage counters written by
 * `request-tracker` and read by the `@itsrose/auth-usage` plugin.
 */
export function usageDayKey(userId: string, date: Date): string {
	return `usage:${userId}:${date.toISOString().slice(0, 10)}`;
}

export function usageCountKey(userId: string, date: Date): string {
	return `${usageDayKey(userId, date)}:count`;
}

export function usageLatencyKey(userId: string, date: Date): string {
	return `${usageDayKey(userId, date)}:latency_ms`;
}

function utcDay(offsetDays: number): Date {
	const date = new Date();
	date.setUTCHours(0, 0, 0, 0);
	date.setUTCDate(date.getUTCDate() - offsetDays);
	return date;
}

/**
 * Records one authenticated request into the daily counters.
 * Callers should invoke it fire-and-forget and log failures themselves.
 */
export async function recordUsage(
	redis: Redis,
	userId: string,
	elapsedMs: number
): Promise<void> {
	const now = new Date();
	const countKey = usageCountKey(userId, now);
	const latencyKey = usageLatencyKey(userId, now);
	await redis
		.pipeline()
		.incr(countKey)
		.expire(countKey, USAGE_COUNTER_TTL_SECONDS)
		.incrby(latencyKey, Math.round(elapsedMs))
		.expire(latencyKey, USAGE_COUNTER_TTL_SECONDS)
		.exec();
}

/**
 * Adapter implementing the usage plugin's {@linkcode UsageStatsPort} against
 * the Redis counters.
 */
export function createRedisUsageStats(redis: Redis): UsageStatsPort {
	return {
		async getStats(userId: string): Promise<UsageStats> {
			const days = Array.from({ length: USAGE_WINDOW_DAYS }, (_, i) =>
				utcDay(i)
			);

			const pipeline = redis.pipeline();
			for (const day of days) {
				pipeline.get(usageCountKey(userId, day));
				pipeline.get(usageLatencyKey(userId, day));
			}
			const results = await pipeline.exec();

			let totalRequests = 0;
			let totalLatencyMs = 0;
			for (let i = 0; i < days.length; i++) {
				const countResult = results?.[i * 2]?.[1];
				const latencyResult = results?.[i * 2 + 1]?.[1];
				const count = Number(countResult ?? 0);
				totalRequests += count;
				totalLatencyMs += Number(latencyResult ?? 0);
			}

			const requestsByDay = days
				.slice(0, USAGE_DAILY_BUCKETS)
				.map((day, i) => {
					const countResult = results?.[i * 2]?.[1];
					return {
						date: day.toISOString().slice(0, 10),
						count: Number(countResult ?? 0),
					};
				})
				.reverse();

			return {
				total_requests: totalRequests,
				avg_latency_ms:
					totalRequests > 0
						? Math.round(totalLatencyMs / totalRequests)
						: 0,
				requests_by_day: requestsByDay,
			};
		},
	};
}
