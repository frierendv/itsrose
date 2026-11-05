import {
	USAGE_DAILY_BUCKETS,
	USAGE_EMPTY_API_KEY,
	USAGE_MAX_WINDOW_DAYS,
	USAGE_WINDOW_DAYS,
} from "../constants";
import { isBillableStatus, sortBreakdown } from "../domain/units";
import {
	periodString,
	USAGE_KEY_TTL,
	usageApiKeyKey,
	usageDayKeys,
	usageDayTenantIndexKey,
	usageEndpointKey,
	usageEndpointTotalKey,
	usageLegacyCountKey,
	usageLegacyLatencyKey,
	usageMonthQuotaKey,
	utcDayRange,
	utcDayString,
} from "../keys";
import type {
	UsageBreakdownDimension,
	UsageBreakdownSlice,
	UsageCounterPort,
	UsageDayCount,
	UsageDayReaderPort,
	UsageDayTenantSnapshot,
	UsageRecord,
	UsageStats,
	UsageTimeseriesPoint,
	UsageWindowSummary,
} from "../types";

/* -------------------------------------------------------------------------- */
/*                        Structural ioredis surface                          */
/* -------------------------------------------------------------------------- */

/**
 * Minimal pipelined command surface used by the adapter.
 *
 * Declared structurally so the package does not depend on `ioredis` (the host
 * application already owns the client) while still accepting the real
 * `Redis` instance from `apps/api`.
 */
export interface UsageRedisPipeline {
	incr(key: string): UsageRedisPipeline;
	incrby(key: string, increment: number): UsageRedisPipeline;
	expire(key: string, seconds: number): UsageRedisPipeline;
	sadd(key: string, ...members: string[]): UsageRedisPipeline;
	get(key: string): UsageRedisPipeline;
	exec(): Promise<unknown>;
}

export interface UsageRedisClient {
	pipeline(): UsageRedisPipeline;
	smembers(key: string): Promise<string[]>;
	get(key: string): Promise<string | null>;
}

/* -------------------------------------------------------------------------- */
/*                                  Helpers                                   */
/* -------------------------------------------------------------------------- */

function pipelineValue(results: unknown, index: number): unknown {
	if (!Array.isArray(results)) {
		return undefined;
	}
	const entry = results[index];
	if (!Array.isArray(entry)) {
		return undefined;
	}
	return entry[1];
}

function toCount(value: unknown): number {
	const numeric = typeof value === "number" ? value : Number(value ?? 0);
	return Number.isFinite(numeric) ? numeric : 0;
}

function clampWindow(windowDays: number | undefined): number {
	const days = Math.trunc(windowDays ?? USAGE_WINDOW_DAYS);
	if (!Number.isFinite(days) || days <= 0) {
		return USAGE_WINDOW_DAYS;
	}
	return Math.min(days, USAGE_MAX_WINDOW_DAYS);
}

const NO_API_KEY_LABEL = "(no key)";

type WindowRead = {
	days: string[];
	requests: number[];
	requestsOk: number[];
	latencyMs: number[];
};

type WindowCounts = { requests: number; requestsOk: number; latencyMs: number };

/* -------------------------------------------------------------------------- */
/*                                  Adapter                                   */
/* -------------------------------------------------------------------------- */

/**
 * Redis-backed counter adapter.
 *
 * Writes are a single pipeline per request (fire-and-forget). Reads merge the
 * new key layout with the legacy per-user keys for one release, so history
 * accumulated before the migration stays visible until the 90 day TTL expires.
 * Both layouts receive the same increments after the deploy, which makes the
 * per-day maximum an exact merge.
 */
export function createRedisUsageCounter(
	redis: UsageRedisClient
): UsageCounterPort {
	async function readWindow(
		tenantId: string,
		windowDays: number,
		legacyUser?: string
	): Promise<WindowRead> {
		const days = utcDayRange(clampWindow(windowDays));

		let pipeline = redis.pipeline();
		days.forEach((day) => {
			const keys = usageDayKeys(tenantId, day);
			pipeline = pipeline
				.get(keys.requests)
				.get(keys.requestsOk)
				.get(keys.latencyMs);
			if (legacyUser) {
				pipeline = pipeline
					.get(usageLegacyCountKey(legacyUser, day))
					.get(usageLegacyLatencyKey(legacyUser, day));
			}
		});

		const results = await pipeline.exec();
		const stride = legacyUser ? 5 : 3;

		const requests: number[] = [];
		const requestsOk: number[] = [];
		const latencyMs: number[] = [];

		days.forEach((_, index) => {
			const base = index * stride;
			const currentRequests = toCount(pipelineValue(results, base));
			const currentOk = toCount(pipelineValue(results, base + 1));
			const currentLatency = toCount(pipelineValue(results, base + 2));

			if (legacyUser) {
				const legacyRequests = toCount(
					pipelineValue(results, base + 3)
				);
				const legacyLatency = toCount(pipelineValue(results, base + 4));
				const mergedRequests = Math.max(
					currentRequests,
					legacyRequests
				);
				const mergedLatency = Math.max(currentLatency, legacyLatency);
				requests.push(mergedRequests);
				requestsOk.push(Math.min(currentOk, mergedRequests));
				latencyMs.push(mergedLatency);
				return;
			}

			requests.push(currentRequests);
			requestsOk.push(Math.min(currentOk, currentRequests));
			latencyMs.push(currentLatency);
		});

		return { days, requests, requestsOk, latencyMs };
	}

	function summarize(window: WindowRead): WindowCounts {
		const totals: WindowCounts = {
			requests: 0,
			requestsOk: 0,
			latencyMs: 0,
		};
		window.requests.forEach((count, index) => {
			totals.requests += count;
			totals.requestsOk += window.requestsOk[index] ?? 0;
			totals.latencyMs += window.latencyMs[index] ?? 0;
		});
		return totals;
	}

	return {
		async record(event: UsageRecord): Promise<void> {
			const at = event.at ?? new Date();
			const day = utcDayString(at);
			const period = periodString(at);
			const keys = usageDayKeys(event.tenant_id, day);
			const dayTtl = USAGE_KEY_TTL.day;
			const periodTtl = USAGE_KEY_TTL.period;
			const budgetMs = Math.round(Math.max(0, event.latency_ms));

			let pipeline = redis.pipeline();
			pipeline = pipeline
				.incr(keys.requests)
				.expire(keys.requests, dayTtl)
				.incrby(keys.latencyMs, budgetMs)
				.expire(keys.latencyMs, dayTtl)
				.sadd(usageDayTenantIndexKey(day), event.tenant_id)
				.expire(usageDayTenantIndexKey(day), dayTtl);

			const legacyUser = event.user_id;
			if (legacyUser) {
				pipeline = pipeline
					.incr(usageLegacyCountKey(legacyUser, day))
					.expire(usageLegacyCountKey(legacyUser, day), dayTtl)
					.incrby(usageLegacyLatencyKey(legacyUser, day), budgetMs)
					.expire(usageLegacyLatencyKey(legacyUser, day), dayTtl);
			}

			const endpointTotalKey = usageEndpointTotalKey(
				event.tenant_id,
				day,
				event.endpoint
			);
			pipeline = pipeline
				.incr(endpointTotalKey)
				.expire(endpointTotalKey, dayTtl)
				.sadd(keys.endpoints, event.endpoint)
				.expire(keys.endpoints, dayTtl);

			if (isBillableStatus(event.status_class)) {
				const apiKeyId = event.api_key_id ?? USAGE_EMPTY_API_KEY;
				const quotaKey = usageMonthQuotaKey(event.tenant_id, period);
				const endpointKey = usageEndpointKey(
					event.tenant_id,
					day,
					event.endpoint
				);
				const apiKeyKey = usageApiKeyKey(
					event.tenant_id,
					day,
					apiKeyId
				);

				pipeline = pipeline
					.incr(keys.requestsOk)
					.expire(keys.requestsOk, dayTtl)
					.incr(quotaKey)
					.expire(quotaKey, periodTtl)
					.incr(endpointKey)
					.expire(endpointKey, dayTtl)
					.sadd(keys.apiKeys, apiKeyId)
					.expire(keys.apiKeys, dayTtl)
					.incr(apiKeyKey)
					.expire(apiKeyKey, dayTtl);
			}

			await pipeline.exec();
		},

		async getStats(tenantId: string, userId?: string): Promise<UsageStats> {
			const window = await readWindow(
				tenantId,
				USAGE_WINDOW_DAYS,
				userId
			);
			const totals = summarize(window);

			const bucketStart = Math.max(
				0,
				window.days.length - USAGE_DAILY_BUCKETS
			);
			const requestsByDay: UsageDayCount[] = window.days
				.slice(bucketStart)
				.map((date, index) => ({
					date,
					count: window.requests[bucketStart + index] ?? 0,
				}));

			return {
				total_requests: totals.requests,
				avg_latency_ms:
					totals.requests > 0
						? Math.round(totals.latencyMs / totals.requests)
						: 0,
				requests_by_day: requestsByDay,
			};
		},

		async getSummary(
			tenantId: string,
			windowDays: number
		): Promise<UsageWindowSummary> {
			const window = await readWindow(tenantId, windowDays);
			const totals = summarize(window);

			return {
				tenant_id: tenantId,
				window_days: window.days.length,
				total_requests: totals.requests,
				requests_ok: totals.requestsOk,
				avg_latency_ms:
					totals.requests > 0
						? Math.round(totals.latencyMs / totals.requests)
						: 0,
			};
		},

		async getTimeseries(
			tenantId: string,
			windowDays: number
		): Promise<UsageTimeseriesPoint[]> {
			const window = await readWindow(tenantId, windowDays);

			return window.days.map((date, index) => ({
				date,
				requests_total: window.requests[index] ?? 0,
				requests_ok: window.requestsOk[index] ?? 0,
			}));
		},

		async getBreakdown(
			tenantId: string,
			dimension: UsageBreakdownDimension,
			windowDays: number
		): Promise<UsageBreakdownSlice[]> {
			const days = utcDayRange(clampWindow(windowDays));
			const setKey = (day: string): string => {
				const keys = usageDayKeys(tenantId, day);
				return dimension === "endpoint" ? keys.endpoints : keys.apiKeys;
			};
			const memberKey = (day: string, member: string): string =>
				dimension === "endpoint"
					? usageEndpointKey(tenantId, day, member)
					: usageApiKeyKey(tenantId, day, member);

			const membersByDay = await Promise.all(
				days.map((day) => redis.smembers(setKey(day)))
			);

			const members = new Set<string>();
			for (const dayMembers of membersByDay) {
				for (const member of dayMembers ?? []) {
					members.add(member);
				}
			}

			if (members.size === 0) {
				return [];
			}

			const memberList = [...members];
			let pipeline = redis.pipeline();
			for (const day of days) {
				for (const member of memberList) {
					pipeline = pipeline.get(memberKey(day, member));
				}
			}
			const results = await pipeline.exec();

			const totals = new Map<string, number>();
			for (const member of memberList) {
				totals.set(member, 0);
			}

			let cursor = 0;
			for (let dayIndex = 0; dayIndex < days.length; dayIndex += 1) {
				for (const member of memberList) {
					const value = toCount(pipelineValue(results, cursor));
					cursor += 1;
					totals.set(member, (totals.get(member) ?? 0) + value);
				}
			}

			const slices: UsageBreakdownSlice[] = memberList.map((member) => ({
				dimension,
				key:
					dimension === "api_key" && member === USAGE_EMPTY_API_KEY
						? NO_API_KEY_LABEL
						: member,
				requests_ok: totals.get(member) ?? 0,
			}));

			return sortBreakdown(slices);
		},

		async getQuotaUsed(tenantId: string, period: string): Promise<number> {
			const raw = await redis.get(usageMonthQuotaKey(tenantId, period));
			return toCount(raw);
		},
	};
}

/**
 * Read side of the hot counters: everything the flush/backfill job needs to
 * project a day of Redis counters into the durable ledger.
 */
export function createRedisUsageDayReader(
	redis: UsageRedisClient
): UsageDayReaderPort {
	return {
		async listTenantIds(day: string): Promise<string[]> {
			const members = await redis.smembers(usageDayTenantIndexKey(day));
			return (members ?? []).filter((member) => member.length > 0);
		},

		async readTenantDay(
			tenantId: string,
			day: string
		): Promise<UsageDayTenantSnapshot> {
			const keys = usageDayKeys(tenantId, day);

			let basePipeline = redis.pipeline();
			basePipeline = basePipeline
				.get(keys.requests)
				.get(keys.requestsOk)
				.get(keys.latencyMs);

			const [baseResults, endpointMembers, apiKeyMembers] =
				await Promise.all([
					basePipeline.exec(),
					redis.smembers(keys.endpoints),
					redis.smembers(keys.apiKeys),
				]);

			const endpoints = (endpointMembers ?? []).filter(
				(member) => member.length > 0
			);
			const apiKeys = (apiKeyMembers ?? []).filter(
				(member) => member.length > 0
			);

			let dimensionPipeline = redis.pipeline();
			for (const endpoint of endpoints) {
				dimensionPipeline = dimensionPipeline
					.get(usageEndpointTotalKey(tenantId, day, endpoint))
					.get(usageEndpointKey(tenantId, day, endpoint));
			}
			for (const apiKeyId of apiKeys) {
				dimensionPipeline = dimensionPipeline.get(
					usageApiKeyKey(tenantId, day, apiKeyId)
				);
			}
			const dimensionResults = await dimensionPipeline.exec();

			let cursor = 0;
			const endpointRows: UsageDayTenantSnapshot["endpoints"] = [];
			for (const endpoint of endpoints) {
				endpointRows.push({
					endpoint,
					requests_total: toCount(
						pipelineValue(dimensionResults, cursor)
					),
					requests_ok: toCount(
						pipelineValue(dimensionResults, cursor + 1)
					),
				});
				cursor += 2;
			}

			const apiKeyRows: UsageDayTenantSnapshot["api_keys"] = [];
			for (const apiKeyId of apiKeys) {
				apiKeyRows.push({
					api_key_id: apiKeyId,
					requests_ok: toCount(
						pipelineValue(dimensionResults, cursor)
					),
				});
				cursor += 1;
			}

			return {
				tenant_id: tenantId,
				requests_total: toCount(pipelineValue(baseResults, 0)),
				requests_ok: toCount(pipelineValue(baseResults, 1)),
				latency_ms_sum: toCount(pipelineValue(baseResults, 2)),
				endpoints: endpointRows,
				api_keys: apiKeyRows,
			};
		},
	};
}
