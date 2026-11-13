import {
	createRedisUsageCounter,
	type UsageRedisClient,
	type UsageRedisPipeline,
} from "../src/adapter/redis";
import {
	USAGE_DAILY_BUCKETS,
	USAGE_MAX_WINDOW_DAYS,
	USAGE_WINDOW_DAYS,
} from "../src/constants";
import {
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
} from "../src/keys";

/* -------------------------------------------------------------------------- */
/*                              Fake Redis client                              */
/* -------------------------------------------------------------------------- */

/**
 * A minimal in-memory Redis.
 *
 * It implements exactly the structural surface the adapter declares
 * (`UsageRedisClient` / `UsageRedisPipeline`), so the adapter can be driven
 * end to end without a server, a docker container or a new dependency.
 *
 * Every pipeline operation is recorded, so a test can assert on the keys that
 * were written, the increments that were applied and the expiry that was set.
 * The stored values are observable too, so a write can be read back.
 */
type RedisOp =
	| { kind: "incr"; key: string }
	| { kind: "incrby"; key: string; increment: number }
	| { kind: "expire"; key: string; seconds: number }
	| { kind: "sadd"; key: string; members: string[] }
	| { kind: "get"; key: string };

type FakeRedis = {
	client: UsageRedisClient;
	/** One entry per `pipeline()` call, in call order. */
	pipelines: RedisOp[][];
	/** Raw stored values (counters, and whatever a test scripted). */
	values: Map<string, unknown>;
	/** Redis sets (`SADD` / `SMEMBERS`). */
	sets: Map<string, Set<string>>;
	/** Expiry set on a key, in seconds. */
	ttls: Map<string, number>;
	/**
	 * Builds the reply of `exec()`. Lets a test simulate a malformed Redis
	 * reply (a non-array, or entries that are not pairs).
	 */
	execResult: (ops: RedisOp[]) => unknown;
	/**
	 * Scripted `SMEMBERS` replies, keyed by Redis key. A `null` entry
	 * simulates a nil reply, which the adapter defends against.
	 */
	scriptedSmembers: Map<string, string[] | null>;
};

function createFakeRedis(initial: Record<string, unknown> = {}): FakeRedis {
	const values = new Map<string, unknown>(Object.entries(initial));
	const sets = new Map<string, Set<string>>();
	const ttls = new Map<string, number>();
	const pipelines: RedisOp[][] = [];

	const readValue = (key: string): unknown => values.get(key) ?? null;

	const toNumber = (value: unknown): number => {
		const numeric = Number(value ?? 0);
		return Number.isFinite(numeric) ? numeric : 0;
	};

	const apply = (op: RedisOp): unknown => {
		switch (op.kind) {
			case "incr": {
				const next = toNumber(readValue(op.key)) + 1;
				values.set(op.key, next);
				return next;
			}
			case "incrby": {
				const next = toNumber(readValue(op.key)) + op.increment;
				values.set(op.key, next);
				return next;
			}
			case "expire": {
				ttls.set(op.key, op.seconds);
				return 1;
			}
			case "sadd": {
				const set = sets.get(op.key) ?? new Set<string>();
				for (const member of op.members) {
					set.add(member);
				}
				sets.set(op.key, set);
				return set.size;
			}
			case "get":
				return readValue(op.key);
		}
	};

	const fake: FakeRedis = {
		pipelines,
		values,
		sets,
		ttls,
		execResult: (ops) => ops.map((op) => [null, apply(op)]),
		scriptedSmembers: new Map<string, string[] | null>(),
		client: undefined as unknown as UsageRedisClient,
	};

	fake.client = {
		pipeline(): UsageRedisPipeline {
			const ops: RedisOp[] = [];
			pipelines.push(ops);
			const pipeline: UsageRedisPipeline = {
				incr(key) {
					ops.push({ kind: "incr", key });
					return pipeline;
				},
				incrby(key, increment) {
					ops.push({ kind: "incrby", key, increment });
					return pipeline;
				},
				expire(key, seconds) {
					ops.push({ kind: "expire", key, seconds });
					return pipeline;
				},
				sadd(key, ...members) {
					ops.push({ kind: "sadd", key, members });
					return pipeline;
				},
				get(key) {
					ops.push({ kind: "get", key });
					return pipeline;
				},
				async exec() {
					return fake.execResult(ops);
				},
			};
			return pipeline;
		},
		async smembers(key) {
			const scripted = fake.scriptedSmembers.get(key);
			if (scripted !== undefined) {
				// The adapter guards against a nil set reply; the fake can
				// produce one to pin that guard.
				return scripted as unknown as string[];
			}
			return [...(sets.get(key) ?? [])];
		},
		async get(key) {
			const value = values.get(key);
			if (value === null || value === undefined) {
				return null;
			}
			return typeof value === "string" ? value : String(value);
		},
	};

	return fake;
}

/* -------------------------------------------------------------------------- */
/*                                 Fixtures                                    */
/* -------------------------------------------------------------------------- */

const TENANT = "tenant-1";
const USER = "user-1";
const ENDPOINT = "/videos/generate";
const API_KEY = "key-abc";
const AT = new Date("2026-11-05T10:30:00.000Z");
const DAY = "2026-11-05";
const PERIOD = "2026-11";

const DAY_TTL = 90 * 24 * 60 * 60;
const PERIOD_TTL = 100 * 24 * 60 * 60;

describe("redis usage counter", () => {
	describe("record", () => {
		it("writes every counter of a billable request in a single pipeline", async () => {
			const fake = createFakeRedis();
			const counter = createRedisUsageCounter(fake.client);

			await counter.record({
				tenant_id: TENANT,
				user_id: USER,
				api_key_id: API_KEY,
				endpoint: ENDPOINT,
				status_class: "2xx",
				latency_ms: 42.4,
				at: AT,
			});

			// One pipeline per request: the whole write is a single round trip.
			expect(fake.pipelines).toHaveLength(1);

			const dayKeys = usageDayKeys(TENANT, DAY);
			const tenantIndex = usageDayTenantIndexKey(DAY);
			const legacyCount = usageLegacyCountKey(USER, DAY);
			const legacyLatency = usageLegacyLatencyKey(USER, DAY);
			const endpointTotal = usageEndpointTotalKey(TENANT, DAY, ENDPOINT);
			const endpointOk = usageEndpointKey(TENANT, DAY, ENDPOINT);
			const quota = usageMonthQuotaKey(TENANT, PERIOD);
			const apiKeyCounter = usageApiKeyKey(TENANT, DAY, API_KEY);

			expect(fake.pipelines[0]).toEqual([
				{ kind: "incr", key: dayKeys.requests },
				{ kind: "expire", key: dayKeys.requests, seconds: DAY_TTL },
				{ kind: "incrby", key: dayKeys.latencyMs, increment: 42 },
				{ kind: "expire", key: dayKeys.latencyMs, seconds: DAY_TTL },
				{ kind: "sadd", key: tenantIndex, members: [TENANT] },
				{ kind: "expire", key: tenantIndex, seconds: DAY_TTL },
				{ kind: "incr", key: legacyCount },
				{ kind: "expire", key: legacyCount, seconds: DAY_TTL },
				{ kind: "incrby", key: legacyLatency, increment: 42 },
				{ kind: "expire", key: legacyLatency, seconds: DAY_TTL },
				{ kind: "incr", key: endpointTotal },
				{ kind: "expire", key: endpointTotal, seconds: DAY_TTL },
				{ kind: "sadd", key: dayKeys.endpoints, members: [ENDPOINT] },
				{ kind: "expire", key: dayKeys.endpoints, seconds: DAY_TTL },
				{ kind: "incr", key: dayKeys.requestsOk },
				{ kind: "expire", key: dayKeys.requestsOk, seconds: DAY_TTL },
				{ kind: "incr", key: quota },
				{ kind: "expire", key: quota, seconds: PERIOD_TTL },
				{ kind: "incr", key: endpointOk },
				{ kind: "expire", key: endpointOk, seconds: DAY_TTL },
				{ kind: "sadd", key: dayKeys.apiKeys, members: [API_KEY] },
				{ kind: "expire", key: dayKeys.apiKeys, seconds: DAY_TTL },
				{ kind: "incr", key: apiKeyCounter },
				{ kind: "expire", key: apiKeyCounter, seconds: DAY_TTL },
			]);
		});

		it("pins the literal key layout of a recorded request", async () => {
			const fake = createFakeRedis();
			const counter = createRedisUsageCounter(fake.client);

			await counter.record({
				tenant_id: TENANT,
				user_id: USER,
				api_key_id: API_KEY,
				endpoint: ENDPOINT,
				status_class: "2xx",
				latency_ms: 10,
				at: AT,
			});

			const written = fake.pipelines[0]?.map((op) => op.key) ?? [];
			expect(written).toContain(`usage:${TENANT}:${DAY}:requests`);
			expect(written).toContain(`usage:${TENANT}:${DAY}:requests_ok`);
			expect(written).toContain(`usage:${TENANT}:${DAY}:latency_ms`);
			expect(written).toContain(`usage:${DAY}:tenants`);
			expect(written).toContain(`usage:${USER}:${DAY}:count`);
			expect(written).toContain(`usage:${USER}:${DAY}:latency_ms`);
			expect(written).toContain(`usage:${TENANT}:${PERIOD}:quota_used`);
		});

		it("sets the 90 day TTL on day keys and the 100 day TTL on the monthly quota", async () => {
			const fake = createFakeRedis();
			const counter = createRedisUsageCounter(fake.client);

			await counter.record({
				tenant_id: TENANT,
				user_id: USER,
				api_key_id: API_KEY,
				endpoint: ENDPOINT,
				status_class: "2xx",
				latency_ms: 10,
				at: AT,
			});

			const dayKeys = usageDayKeys(TENANT, DAY);
			expect(fake.ttls.get(dayKeys.requests)).toBe(DAY_TTL);
			expect(fake.ttls.get(dayKeys.requestsOk)).toBe(DAY_TTL);
			expect(fake.ttls.get(dayKeys.latencyMs)).toBe(DAY_TTL);
			expect(fake.ttls.get(dayKeys.endpoints)).toBe(DAY_TTL);
			expect(fake.ttls.get(dayKeys.apiKeys)).toBe(DAY_TTL);
			expect(fake.ttls.get(usageDayTenantIndexKey(DAY))).toBe(DAY_TTL);
			expect(fake.ttls.get(usageLegacyCountKey(USER, DAY))).toBe(DAY_TTL);
			expect(fake.ttls.get(usageLegacyLatencyKey(USER, DAY))).toBe(
				DAY_TTL
			);
			expect(fake.ttls.get(usageMonthQuotaKey(TENANT, PERIOD))).toBe(
				PERIOD_TTL
			);
			expect(USAGE_KEY_TTL.day).toBe(DAY_TTL);
			expect(USAGE_KEY_TTL.period).toBe(PERIOD_TTL);
		});

		it("does not write the billable counters for a non-billable status class", async () => {
			const fake = createFakeRedis();
			const counter = createRedisUsageCounter(fake.client);

			await counter.record({
				tenant_id: TENANT,
				user_id: USER,
				api_key_id: API_KEY,
				endpoint: ENDPOINT,
				status_class: "4xx",
				latency_ms: 10,
				at: AT,
			});

			const dayKeys = usageDayKeys(TENANT, DAY);
			const written = fake.pipelines[0]?.map((op) => op.key) ?? [];
			expect(written).not.toContain(dayKeys.requestsOk);
			expect(written).not.toContain(usageMonthQuotaKey(TENANT, PERIOD));
			expect(written).not.toContain(
				usageEndpointKey(TENANT, DAY, ENDPOINT)
			);
			expect(written).not.toContain(dayKeys.apiKeys);
			expect(written).not.toContain(usageApiKeyKey(TENANT, DAY, API_KEY));

			// The request itself is still counted: a 4xx is traffic, just not billable.
			expect(written).toContain(dayKeys.requests);
			expect(written).toContain(
				usageEndpointTotalKey(TENANT, DAY, ENDPOINT)
			);
		});

		it("buckets a request without an api key under the empty sentinel", async () => {
			const fake = createFakeRedis();
			const counter = createRedisUsageCounter(fake.client);

			await counter.record({
				tenant_id: TENANT,
				user_id: USER,
				api_key_id: null,
				endpoint: ENDPOINT,
				status_class: "2xx",
				latency_ms: 10,
				at: AT,
			});

			const dayKeys = usageDayKeys(TENANT, DAY);
			expect(fake.pipelines[0]).toContainEqual({
				kind: "sadd",
				key: dayKeys.apiKeys,
				members: [""],
			});
			expect(fake.pipelines[0]).toContainEqual({
				kind: "incr",
				key: `usage:${TENANT}:${DAY}:key::requests_ok`,
			});
		});

		it("skips the legacy keys when the request has no user", async () => {
			const fake = createFakeRedis();
			const counter = createRedisUsageCounter(fake.client);

			await counter.record({
				tenant_id: TENANT,
				user_id: "",
				api_key_id: API_KEY,
				endpoint: ENDPOINT,
				status_class: "2xx",
				latency_ms: 10,
				at: AT,
			});

			const written = fake.pipelines[0]?.map((op) => op.key) ?? [];
			expect(written).not.toContain(usageLegacyCountKey("", DAY));
			expect(written).not.toContain(usageLegacyLatencyKey("", DAY));
		});

		it("clamps a negative latency to zero and rounds the rest", async () => {
			const fake = createFakeRedis();
			const counter = createRedisUsageCounter(fake.client);

			await counter.record({
				tenant_id: TENANT,
				user_id: USER,
				api_key_id: API_KEY,
				endpoint: ENDPOINT,
				status_class: "2xx",
				latency_ms: -5,
				at: AT,
			});
			await counter.record({
				tenant_id: TENANT,
				user_id: USER,
				api_key_id: API_KEY,
				endpoint: ENDPOINT,
				status_class: "2xx",
				latency_ms: 12.6,
				at: AT,
			});

			expect(fake.pipelines[0]).toContainEqual({
				kind: "incrby",
				key: usageDayKeys(TENANT, DAY).latencyMs,
				increment: 0,
			});
			expect(fake.pipelines[1]).toContainEqual({
				kind: "incrby",
				key: usageDayKeys(TENANT, DAY).latencyMs,
				increment: 13,
			});
			expect(fake.values.get(usageDayKeys(TENANT, DAY).latencyMs)).toBe(
				13
			);
		});

		it("falls back to the current UTC day when the event carries no timestamp", async () => {
			const fake = createFakeRedis();
			const counter = createRedisUsageCounter(fake.client);

			const before = utcDayString(new Date());
			await counter.record({
				tenant_id: TENANT,
				user_id: USER,
				api_key_id: API_KEY,
				endpoint: ENDPOINT,
				status_class: "2xx",
				latency_ms: 10,
			});
			const after = utcDayString(new Date());

			const written = fake.pipelines[0]?.map((op) => op.key) ?? [];
			const requestsKey = written.find((key) =>
				key.endsWith(":requests")
			);
			const day = requestsKey?.split(":")[2];

			expect(day).toBeDefined();
			expect([before, after]).toContain(day);
		});

		it("makes the recorded counters readable again", async () => {
			const fake = createFakeRedis();
			const counter = createRedisUsageCounter(fake.client);

			await counter.record({
				tenant_id: TENANT,
				user_id: USER,
				api_key_id: API_KEY,
				endpoint: ENDPOINT,
				status_class: "2xx",
				latency_ms: 30,
				at: AT,
			});

			const dayKeys = usageDayKeys(TENANT, DAY);
			expect(fake.values.get(dayKeys.requests)).toBe(1);
			expect(fake.values.get(dayKeys.requestsOk)).toBe(1);
			expect(fake.values.get(usageLegacyCountKey(USER, DAY))).toBe(1);
			expect(fake.values.get(usageMonthQuotaKey(TENANT, PERIOD))).toBe(1);
			expect([
				...(fake.sets.get(usageDayTenantIndexKey(DAY)) ?? []),
			]).toEqual([TENANT]);
		});
	});

	describe("legacy merge", () => {
		/**
		 * The merge rule, in one sentence: a day is counted by the LARGER of
		 * the new per-tenant layout and the legacy per-user layout, because
		 * both layouts receive the same increments after the deploy, so the
		 * maximum is the exact merge of the two histories.
		 *
		 * The same rule applies to the latency sum.
		 *
		 * The billable count is NOT merged with a maximum: the legacy layout
		 * has no billable counter at all, so the merged day keeps the billable
		 * count of the new layout, clamped down to the merged request count
		 * (a day can never have more successes than requests). The clamp is
		 * pinned below on the non-legacy reads, because `getStats` — the only
		 * read that merges with the legacy layout — does not expose the
		 * billable count at all.
		 */
		it("counts a day by the larger of the new and the legacy layout", async () => {
			const fake = createFakeRedis();
			const days = utcDayRange(USAGE_WINDOW_DAYS);
			const today = days[days.length - 1] as string;
			const yesterday = days[days.length - 2] as string;

			const todayKeys = usageDayKeys(TENANT, today);
			fake.values.set(todayKeys.requests, "4");
			fake.values.set(todayKeys.requestsOk, "3");
			fake.values.set(todayKeys.latencyMs, "80");
			// The legacy layout still holds more traffic for that day.
			fake.values.set(usageLegacyCountKey(USER, today), "9");
			fake.values.set(usageLegacyLatencyKey(USER, today), "30");

			const yesterdayKeys = usageDayKeys(TENANT, yesterday);
			fake.values.set(yesterdayKeys.requests, "10");
			fake.values.set(yesterdayKeys.requestsOk, "10");
			fake.values.set(yesterdayKeys.latencyMs, "100");
			// Here the new layout holds more traffic than the legacy one.
			fake.values.set(usageLegacyCountKey(USER, yesterday), "2");
			fake.values.set(usageLegacyLatencyKey(USER, yesterday), "500");

			const counter = createRedisUsageCounter(fake.client);
			const stats = await counter.getStats(TENANT, USER);

			expect(stats.total_requests).toBe(19);
			expect(stats.avg_latency_ms).toBe(Math.round(580 / 19));

			const byDay = new Map(
				stats.requests_by_day.map((entry) => [entry.date, entry.count])
			);
			expect(byDay.get(today)).toBe(9);
			expect(byDay.get(yesterday)).toBe(10);
		});

		it("merges a day that only exists in the legacy layout", async () => {
			const fake = createFakeRedis();
			const days = utcDayRange(USAGE_WINDOW_DAYS);
			const today = days[days.length - 1] as string;

			// Pre-migration traffic: only the legacy per-user keys exist.
			fake.values.set(usageLegacyCountKey(USER, today), "3");
			fake.values.set(usageLegacyLatencyKey(USER, today), "20");

			const counter = createRedisUsageCounter(fake.client);
			const stats = await counter.getStats(TENANT, USER);

			expect(stats.total_requests).toBe(3);
			expect(stats.requests_by_day.at(-1)?.count).toBe(3);
		});

		it("ignores the legacy layout when no user is given", async () => {
			const fake = createFakeRedis();
			const days = utcDayRange(USAGE_WINDOW_DAYS);
			const today = days[days.length - 1] as string;

			fake.values.set(usageDayKeys(TENANT, today).requests, "4");
			fake.values.set(usageLegacyCountKey(USER, today), "9");

			const counter = createRedisUsageCounter(fake.client);
			const stats = await counter.getStats(TENANT);

			expect(stats.total_requests).toBe(4);
		});

		it("reads five values per day when the legacy keys are present and three when they are not", async () => {
			const withLegacy = createFakeRedis();
			await createRedisUsageCounter(withLegacy.client).getStats(
				TENANT,
				USER
			);
			const legacyGets = withLegacy.pipelines
				.flat()
				.filter((op) => op.kind === "get");
			expect(legacyGets).toHaveLength(USAGE_WINDOW_DAYS * 5);

			const withoutLegacy = createFakeRedis();
			await createRedisUsageCounter(withoutLegacy.client).getStats(
				TENANT
			);
			const plainGets = withoutLegacy.pipelines
				.flat()
				.filter((op) => op.kind === "get");
			expect(plainGets).toHaveLength(USAGE_WINDOW_DAYS * 3);
		});
	});

	describe("read window", () => {
		it("clamps a day to its request count so successes never exceed requests", async () => {
			// The rule the legacy merge also applies: the billable count of a
			// day is the smaller of the billable counter and the request
			// counter, never more.

			const fake = createFakeRedis();
			const days = utcDayRange(2);
			const [older, newer] = days;

			const olderKeys = usageDayKeys(TENANT, older as string);
			fake.values.set(olderKeys.requests, "5");
			fake.values.set(olderKeys.requestsOk, "2");

			const newerKeys = usageDayKeys(TENANT, newer as string);
			fake.values.set(newerKeys.requests, "3");
			// More successes than requests: a corrupt day, clamped down.
			fake.values.set(newerKeys.requestsOk, "9");

			const counter = createRedisUsageCounter(fake.client);
			const series = await counter.getTimeseries(TENANT, 2);

			expect(series).toEqual([
				{ date: older, requests_total: 5, requests_ok: 2 },
				{ date: newer, requests_total: 3, requests_ok: 3 },
			]);
		});

		it("returns zeroed buckets for days without any traffic", async () => {
			const fake = createFakeRedis();
			const counter = createRedisUsageCounter(fake.client);

			const series = await counter.getTimeseries(TENANT, 3);

			expect(series).toHaveLength(3);
			expect(series.every((point) => point.requests_total === 0)).toBe(
				true
			);
			expect(series.every((point) => point.requests_ok === 0)).toBe(true);
		});

		it("clamps the window to the default when it is zero or negative", async () => {
			const fake = createFakeRedis();
			const counter = createRedisUsageCounter(fake.client);

			const zero = await counter.getSummary(TENANT, 0);
			const negative = await counter.getSummary(TENANT, -7);

			expect(zero.window_days).toBe(USAGE_WINDOW_DAYS);
			expect(negative.window_days).toBe(USAGE_WINDOW_DAYS);
		});

		it("clamps the window to the default when it is not a number", async () => {
			const fake = createFakeRedis();
			const counter = createRedisUsageCounter(fake.client);

			const summary = await counter.getSummary(
				TENANT,
				undefined as unknown as number
			);

			expect(summary.window_days).toBe(USAGE_WINDOW_DAYS);
		});

		it("reads a single day when the window is one", async () => {
			const fake = createFakeRedis();
			const counter = createRedisUsageCounter(fake.client);

			const summary = await counter.getSummary(TENANT, 1);
			const gets = fake.pipelines
				.flat()
				.filter((op) => op.kind === "get");

			expect(summary.window_days).toBe(1);
			expect(gets).toHaveLength(3);
		});

		it("clamps a very large window to the counter retention", async () => {
			const fake = createFakeRedis();
			const counter = createRedisUsageCounter(fake.client);

			const summary = await counter.getSummary(TENANT, 1_000_000);
			const gets = fake.pipelines
				.flat()
				.filter((op) => op.kind === "get");

			expect(summary.window_days).toBe(USAGE_MAX_WINDOW_DAYS);
			expect(USAGE_MAX_WINDOW_DAYS).toBe(90);
			expect(gets).toHaveLength(USAGE_MAX_WINDOW_DAYS * 3);
		});

		it("truncates a fractional window", async () => {
			const fake = createFakeRedis();
			const counter = createRedisUsageCounter(fake.client);

			const summary = await counter.getSummary(TENANT, 2.9);

			expect(summary.window_days).toBe(2);
		});
	});

	describe("totals", () => {
		it("summarizes the requests, the successes and the average latency of a window", async () => {
			const fake = createFakeRedis();
			const days = utcDayRange(3);
			const [first, second, third] = days;

			const firstKeys = usageDayKeys(TENANT, first as string);
			fake.values.set(firstKeys.requests, "4");
			fake.values.set(firstKeys.requestsOk, "3");
			fake.values.set(firstKeys.latencyMs, "100");

			const secondKeys = usageDayKeys(TENANT, second as string);
			fake.values.set(secondKeys.requests, "6");
			fake.values.set(secondKeys.requestsOk, "6");
			fake.values.set(secondKeys.latencyMs, "200");

			const thirdKeys = usageDayKeys(TENANT, third as string);
			fake.values.set(thirdKeys.requests, "2");
			fake.values.set(thirdKeys.requestsOk, "0");
			fake.values.set(thirdKeys.latencyMs, "50");

			const counter = createRedisUsageCounter(fake.client);
			const summary = await counter.getSummary(TENANT, 3);

			expect(summary).toEqual({
				tenant_id: TENANT,
				window_days: 3,
				total_requests: 12,
				requests_ok: 9,
				avg_latency_ms: Math.round(350 / 12),
			});
		});

		it("reports a zero average latency for an empty window", async () => {
			const fake = createFakeRedis();
			const counter = createRedisUsageCounter(fake.client);

			const summary = await counter.getSummary(TENANT, 3);

			expect(summary.total_requests).toBe(0);
			expect(summary.requests_ok).toBe(0);
			expect(summary.avg_latency_ms).toBe(0);
		});

		it("returns the last seven daily buckets of the stats window, oldest first", async () => {
			const fake = createFakeRedis();
			const days = utcDayRange(USAGE_WINDOW_DAYS);
			const counter = createRedisUsageCounter(fake.client);

			for (const [offset, count] of [
				[0, 1],
				[1, 2],
				[2, 3],
			] as const) {
				const day = days[days.length - 1 - offset] as string;
				fake.values.set(
					usageDayKeys(TENANT, day).requests,
					String(count)
				);
			}

			const stats = await counter.getStats(TENANT);

			expect(stats.requests_by_day).toHaveLength(USAGE_DAILY_BUCKETS);
			expect(stats.requests_by_day.map((entry) => entry.count)).toEqual([
				0, 0, 0, 0, 3, 2, 1,
			]);
			expect(stats.total_requests).toBe(6);
			expect(stats.avg_latency_ms).toBe(0);
		});
	});

	describe("value parsing", () => {
		it("reads a numeric string, a number and a missing key as counters", async () => {
			const fake = createFakeRedis();
			const days = utcDayRange(3);
			const [first, second] = days;

			fake.values.set(
				usageDayKeys(TENANT, first as string).requests,
				"7"
			);
			fake.values.set(
				usageDayKeys(TENANT, second as string).requests,
				11
			);
			// The third day has no key at all: Redis replies with nil.

			const counter = createRedisUsageCounter(fake.client);
			const summary = await counter.getSummary(TENANT, 3);

			expect(summary.total_requests).toBe(18);
		});

		it("counts a non-numeric value as zero instead of NaN", async () => {
			const fake = createFakeRedis();
			const days = utcDayRange(2);
			const day = days[0] as string;

			fake.values.set(usageDayKeys(TENANT, day).requests, "not-a-number");
			fake.values.set(usageDayKeys(TENANT, day).requestsOk, "12abc");
			fake.values.set(usageDayKeys(TENANT, day).latencyMs, {
				unexpected: true,
			});

			const counter = createRedisUsageCounter(fake.client);
			const summary = await counter.getSummary(TENANT, 2);

			expect(summary.total_requests).toBe(0);
			expect(summary.requests_ok).toBe(0);
			expect(summary.avg_latency_ms).toBe(0);
			expect(Number.isFinite(summary.total_requests)).toBe(true);
		});

		it("counts an infinite value as zero", async () => {
			const fake = createFakeRedis();
			const days = utcDayRange(1);
			const day = days[0] as string;

			fake.values.set(
				usageDayKeys(TENANT, day).requests,
				Number.POSITIVE_INFINITY
			);

			const counter = createRedisUsageCounter(fake.client);
			const summary = await counter.getSummary(TENANT, 1);

			expect(summary.total_requests).toBe(0);
		});

		it("survives a malformed pipeline reply", async () => {
			const fake = createFakeRedis();
			fake.execResult = () => null;
			const counter = createRedisUsageCounter(fake.client);

			const summary = await counter.getSummary(TENANT, 3);

			expect(summary.total_requests).toBe(0);
			expect(summary.requests_ok).toBe(0);
		});

		it("survives a pipeline reply whose entries are not pairs", async () => {
			const fake = createFakeRedis();
			fake.execResult = () => [1, 2, 3];
			const counter = createRedisUsageCounter(fake.client);

			const summary = await counter.getSummary(TENANT, 3);

			expect(summary.total_requests).toBe(0);
			expect(summary.requests_ok).toBe(0);
		});
	});

	describe("quota", () => {
		it("reads the billable requests consumed in a period", async () => {
			const fake = createFakeRedis();
			fake.values.set(usageMonthQuotaKey(TENANT, PERIOD), "17");

			const counter = createRedisUsageCounter(fake.client);

			await expect(counter.getQuotaUsed(TENANT, PERIOD)).resolves.toBe(
				17
			);
		});

		it("reports zero quota for an unknown period", async () => {
			const fake = createFakeRedis();
			const counter = createRedisUsageCounter(fake.client);

			await expect(counter.getQuotaUsed(TENANT, "1999-01")).resolves.toBe(
				0
			);
		});

		it("reports zero quota for a non-numeric counter", async () => {
			const fake = createFakeRedis();
			fake.values.set(usageMonthQuotaKey(TENANT, PERIOD), "corrupt");

			const counter = createRedisUsageCounter(fake.client);

			await expect(counter.getQuotaUsed(TENANT, PERIOD)).resolves.toBe(0);
		});
	});

	describe("breakdown", () => {
		it("sums the billable requests per endpoint over the window", async () => {
			const fake = createFakeRedis();
			const days = utcDayRange(2);
			const [first, second] = days;

			fake.sets.set(
				usageDayKeys(TENANT, first as string).endpoints,
				new Set(["/a", "/b"])
			);
			fake.sets.set(
				usageDayKeys(TENANT, second as string).endpoints,
				new Set(["/b"])
			);

			fake.values.set(
				usageEndpointKey(TENANT, first as string, "/a"),
				"3"
			);
			fake.values.set(
				usageEndpointKey(TENANT, first as string, "/b"),
				"5"
			);
			fake.values.set(
				usageEndpointKey(TENANT, second as string, "/a"),
				"1"
			);

			const counter = createRedisUsageCounter(fake.client);
			const slices = await counter.getBreakdown(TENANT, "endpoint", 2);

			expect(slices).toEqual([
				{ dimension: "endpoint", key: "/b", requests_ok: 5 },
				{ dimension: "endpoint", key: "/a", requests_ok: 4 },
			]);
		});

		it("labels the empty api key sentinel as (no key)", async () => {
			const fake = createFakeRedis();
			const days = utcDayRange(1);
			const day = days[0] as string;

			fake.sets.set(
				usageDayKeys(TENANT, day).apiKeys,
				new Set(["", "key-abc"])
			);
			fake.values.set(usageApiKeyKey(TENANT, day, ""), "2");
			fake.values.set(usageApiKeyKey(TENANT, day, "key-abc"), "7");

			const counter = createRedisUsageCounter(fake.client);
			const slices = await counter.getBreakdown(TENANT, "api_key", 1);

			expect(slices).toEqual([
				{ dimension: "api_key", key: "key-abc", requests_ok: 7 },
				{ dimension: "api_key", key: "(no key)", requests_ok: 2 },
			]);
		});

		it("returns no slice when the tenant has no dimension members", async () => {
			const fake = createFakeRedis();
			const counter = createRedisUsageCounter(fake.client);

			await expect(
				counter.getBreakdown(TENANT, "endpoint", 3)
			).resolves.toEqual([]);
		});

		it("tolerates a nil set reply instead of throwing", async () => {
			const fake = createFakeRedis();
			const days = utcDayRange(2);
			for (const day of days) {
				fake.scriptedSmembers.set(
					usageDayKeys(TENANT, day).endpoints,
					null
				);
			}

			const counter = createRedisUsageCounter(fake.client);

			await expect(
				counter.getBreakdown(TENANT, "endpoint", 2)
			).resolves.toEqual([]);
		});
	});
});
