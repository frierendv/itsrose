import {
	createRedisUsageDayReader,
	type UsageRedisClient,
	type UsageRedisPipeline,
} from "../src/adapter/redis";
import {
	usageApiKeyKey,
	usageDayKeys,
	usageDayTenantIndexKey,
	usageEndpointKey,
	usageEndpointTotalKey,
} from "../src/keys";

/* -------------------------------------------------------------------------- */
/*                              Fake Redis client                              */
/* -------------------------------------------------------------------------- */

/**
 * A minimal in-memory Redis for the read side.
 *
 * The day reader only ever issues `GET`s and `SMEMBERS`, so the fake only
 * needs those two. The keys of every pipeline read are recorded, so a test
 * can assert exactly which counters were projected.
 */
type FakeRedis = {
	client: UsageRedisClient;
	/** Keys read by each pipeline, in call order. */
	pipelines: string[][];
	/** Raw stored values. */
	values: Map<string, unknown>;
	/** Redis sets (`SMEMBERS`). */
	sets: Map<string, Set<string>>;
	/**
	 * Scripted `SMEMBERS` replies, keyed by Redis key. A `null` entry
	 * simulates a nil reply, which the adapter defends against.
	 */
	scriptedSmembers: Map<string, string[] | null>;
};

function createFakeRedis(initial: Record<string, unknown> = {}): FakeRedis {
	const values = new Map<string, unknown>(Object.entries(initial));
	const sets = new Map<string, Set<string>>();
	const pipelines: string[][] = [];

	const fake: FakeRedis = {
		pipelines,
		values,
		sets,
		scriptedSmembers: new Map<string, string[] | null>(),
		client: undefined as unknown as UsageRedisClient,
	};

	fake.client = {
		pipeline(): UsageRedisPipeline {
			const reads: string[] = [];
			pipelines.push(reads);
			const pipeline: UsageRedisPipeline = {
				incr() {
					return pipeline;
				},
				incrby() {
					return pipeline;
				},
				expire() {
					return pipeline;
				},
				sadd() {
					return pipeline;
				},
				get(key) {
					reads.push(key);
					return pipeline;
				},
				async exec() {
					return reads.map((key) => [null, values.get(key) ?? null]);
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
const DAY = "2026-11-05";
const ENDPOINT = "/videos/generate";
const OTHER_ENDPOINT = "/status";
const API_KEY = "key-abc";

describe("redis usage day reader", () => {
	describe("listTenantIds", () => {
		it("lists the tenants that produced traffic on a day", async () => {
			const fake = createFakeRedis();
			fake.sets.set(
				usageDayTenantIndexKey(DAY),
				new Set([TENANT, "tenant-2"])
			);

			const reader = createRedisUsageDayReader(fake.client);

			await expect(reader.listTenantIds(DAY)).resolves.toEqual([
				TENANT,
				"tenant-2",
			]);
		});

		it("returns an empty list for a day without traffic", async () => {
			const fake = createFakeRedis();
			const reader = createRedisUsageDayReader(fake.client);

			await expect(reader.listTenantIds(DAY)).resolves.toEqual([]);
		});

		it("drops empty members of the tenant index", async () => {
			const fake = createFakeRedis();
			fake.sets.set(usageDayTenantIndexKey(DAY), new Set(["", TENANT]));

			const reader = createRedisUsageDayReader(fake.client);

			await expect(reader.listTenantIds(DAY)).resolves.toEqual([TENANT]);
		});

		it("tolerates a nil set reply instead of throwing", async () => {
			const fake = createFakeRedis();
			fake.scriptedSmembers.set(usageDayTenantIndexKey(DAY), null);

			const reader = createRedisUsageDayReader(fake.client);

			await expect(reader.listTenantIds(DAY)).resolves.toEqual([]);
		});
	});

	describe("readTenantDay", () => {
		it("projects a tenant day into a snapshot of its counters", async () => {
			const fake = createFakeRedis();
			const dayKeys = usageDayKeys(TENANT, DAY);

			fake.values.set(dayKeys.requests, "10");
			fake.values.set(dayKeys.requestsOk, "7");
			fake.values.set(dayKeys.latencyMs, "120");
			fake.sets.set(dayKeys.endpoints, new Set([ENDPOINT]));
			fake.sets.set(dayKeys.apiKeys, new Set([API_KEY]));

			fake.values.set(usageEndpointTotalKey(TENANT, DAY, ENDPOINT), "10");
			fake.values.set(usageEndpointKey(TENANT, DAY, ENDPOINT), "7");
			fake.values.set(usageApiKeyKey(TENANT, DAY, API_KEY), "7");

			const reader = createRedisUsageDayReader(fake.client);
			const snapshot = await reader.readTenantDay(TENANT, DAY);

			expect(snapshot).toEqual({
				tenant_id: TENANT,
				requests_total: 10,
				requests_ok: 7,
				latency_ms_sum: 120,
				endpoints: [
					{ endpoint: ENDPOINT, requests_total: 10, requests_ok: 7 },
				],
				api_keys: [{ api_key_id: API_KEY, requests_ok: 7 }],
			});
		});

		it("reads the base counters and then one dimension counter per member", async () => {
			const fake = createFakeRedis();
			const dayKeys = usageDayKeys(TENANT, DAY);

			fake.sets.set(
				dayKeys.endpoints,
				new Set([ENDPOINT, OTHER_ENDPOINT])
			);
			fake.sets.set(dayKeys.apiKeys, new Set([API_KEY]));

			const reader = createRedisUsageDayReader(fake.client);
			await reader.readTenantDay(TENANT, DAY);

			// First the three base counters, then the dimension counters:
			// two per endpoint (total and billable) and one per api key.
			expect(fake.pipelines[0]).toEqual([
				dayKeys.requests,
				dayKeys.requestsOk,
				dayKeys.latencyMs,
			]);
			expect(fake.pipelines[1]).toEqual([
				usageEndpointTotalKey(TENANT, DAY, ENDPOINT),
				usageEndpointKey(TENANT, DAY, ENDPOINT),
				usageEndpointTotalKey(TENANT, DAY, OTHER_ENDPOINT),
				usageEndpointKey(TENANT, DAY, OTHER_ENDPOINT),
				usageApiKeyKey(TENANT, DAY, API_KEY),
			]);
		});

		it("returns an empty snapshot for a day without traffic", async () => {
			const fake = createFakeRedis();
			const reader = createRedisUsageDayReader(fake.client);

			const snapshot = await reader.readTenantDay(TENANT, DAY);

			expect(snapshot).toEqual({
				tenant_id: TENANT,
				requests_total: 0,
				requests_ok: 0,
				latency_ms_sum: 0,
				endpoints: [],
				api_keys: [],
			});
		});

		it("drops empty members of the dimension sets", async () => {
			const fake = createFakeRedis();
			const dayKeys = usageDayKeys(TENANT, DAY);

			fake.sets.set(dayKeys.endpoints, new Set(["", ENDPOINT]));
			fake.sets.set(dayKeys.apiKeys, new Set([""]));
			fake.values.set(usageEndpointTotalKey(TENANT, DAY, ENDPOINT), "2");
			fake.values.set(usageEndpointKey(TENANT, DAY, ENDPOINT), "2");

			const reader = createRedisUsageDayReader(fake.client);
			const snapshot = await reader.readTenantDay(TENANT, DAY);

			expect(snapshot.endpoints).toEqual([
				{ endpoint: ENDPOINT, requests_total: 2, requests_ok: 2 },
			]);
			expect(snapshot.api_keys).toEqual([]);
		});

		it("tolerates nil set replies for the dimension sets", async () => {
			const fake = createFakeRedis();
			const dayKeys = usageDayKeys(TENANT, DAY);

			fake.scriptedSmembers.set(dayKeys.endpoints, null);
			fake.scriptedSmembers.set(dayKeys.apiKeys, null);
			fake.values.set(dayKeys.requests, "4");

			const reader = createRedisUsageDayReader(fake.client);
			const snapshot = await reader.readTenantDay(TENANT, DAY);

			expect(snapshot.requests_total).toBe(4);
			expect(snapshot.endpoints).toEqual([]);
			expect(snapshot.api_keys).toEqual([]);
		});

		it("counts a corrupt counter as zero instead of NaN", async () => {
			const fake = createFakeRedis();
			const dayKeys = usageDayKeys(TENANT, DAY);

			fake.values.set(dayKeys.requests, "not-a-number");
			fake.values.set(dayKeys.requestsOk, "12abc");
			fake.values.set(dayKeys.latencyMs, { unexpected: true });

			const reader = createRedisUsageDayReader(fake.client);
			const snapshot = await reader.readTenantDay(TENANT, DAY);

			expect(snapshot.requests_total).toBe(0);
			expect(snapshot.requests_ok).toBe(0);
			expect(snapshot.latency_ms_sum).toBe(0);
		});
	});
});
