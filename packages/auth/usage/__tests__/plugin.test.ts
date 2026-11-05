import { tenantIdForUser } from "../src/keys";
import { usagePlugin } from "../src/plugin/plugin-server";
import type {
	UsageCounterPort,
	UsagePlanPort,
	UsageQuotaSnapshot,
} from "../src/types";

function createCounter(used: number): UsageCounterPort {
	return {
		record: async () => {},
		getStats: async () => ({
			total_requests: 0,
			avg_latency_ms: 0,
			requests_by_day: [],
		}),
		getSummary: async () => ({
			tenant_id: "t",
			window_days: 30,
			total_requests: 0,
			requests_ok: 0,
			avg_latency_ms: 0,
		}),
		getTimeseries: async () => [],
		getBreakdown: async () => [],
		getQuotaUsed: async () => used,
	};
}

const plans: UsagePlanPort = {
	forTenant: async (tenantId) => ({
		tenant_id: tenantId,
		user_id: "usr_1",
		plan_tier: "pro",
		quota_requests: 10,
	}),
};

function endpointOf(name: string) {
	const plugin = usagePlugin({
		counter: createCounter(5),
		plans,
		quota_mode: "soft",
	});
	const endpoints = plugin.endpoints as Record<
		string,
		{ path?: string } | undefined
	>;
	return { plugin, endpoint: endpoints[name], all: endpoints };
}

describe("usage plugin surface", () => {
	it("registers the read and admin endpoints", () => {
		const { all } = endpointOf("getStats");
		expect(Object.keys(all).sort()).toEqual(
			[
				"flushUsage",
				"getBreakdown",
				"getQuota",
				"getStats",
				"getSummary",
				"getTimeseries",
				"listUsageRates",
				"listUsageSettlements",
				"setUsageRate",
				"settleUsage",
				"syncUsageTenants",
			].sort()
		);
	});

	it("mounts every endpoint under /usage", () => {
		const { all } = endpointOf("getStats");
		for (const endpoint of Object.values(all)) {
			expect(endpoint?.path?.startsWith("/usage/")).toBe(true);
		}
	});
});

describe("getQuota endpoint", () => {
	it("returns a snake_case snapshot and sets quota headers", async () => {
		const { plugin } = endpointOf("getQuota");
		const endpoints = plugin.endpoints as Record<
			string,
			(context: unknown) => Promise<unknown>
		>;
		const setHeader = jest.fn();
		const context = {
			context: { session: { user: { id: "usr_1" } } },
			setHeader,
			json: (payload: unknown) => payload,
		};

		const result = (await endpoints.getQuota?.(
			context
		)) as UsageQuotaSnapshot;

		expect(result).toMatchObject({
			tenant_id: tenantIdForUser("usr_1"),
			used: 5,
			limit: 10,
			remaining: 5,
			mode: "soft",
			enforced: false,
		});
		expect(typeof result.period).toBe("string");
		expect(typeof result.reset_at).toBe("string");
		expect(setHeader).toHaveBeenCalledWith("x-quota-limit", "10");
		expect(setHeader).toHaveBeenCalledWith("x-quota-remaining", "5");
	});
});

describe("seeded rate defaults", () => {
	function createRates() {
		const ensureDefaults = jest.fn(async () => {});
		const rates = {
			ensureDefaults,
			listOpen: jest.fn(async () => []),
			resolveAt: jest.fn(async () => null),
			setRate: jest.fn(async () => {
				throw new Error("not used");
			}),
			listWeights: jest.fn(async () => []),
		};
		return { rates, ensureDefaults };
	}

	it("seeds defaults from the plugin init", async () => {
		const { rates, ensureDefaults } = createRates();
		const plugin = usagePlugin({
			counter: createCounter(0),
			rates,
			plan_tiers: ["free", "pro"],
		});

		await (plugin.init as () => Promise<void>)();

		expect(ensureDefaults).toHaveBeenCalledWith({
			plan_tiers: ["free", "pro"],
			unit: "request",
		});
	});

	it("can disable boot seeding", async () => {
		const { rates, ensureDefaults } = createRates();
		const plugin = usagePlugin({
			counter: createCounter(0),
			rates,
			plan_tiers: ["free"],
			seed_default_rates: false,
		});

		await (plugin.init as () => Promise<void>)();
		expect(ensureDefaults).not.toHaveBeenCalled();
	});

	it("seeds again when the admin rate list is requested", async () => {
		const { rates, ensureDefaults } = createRates();
		const plugin = usagePlugin({
			counter: createCounter(0),
			rates,
			plan_tiers: ["free"],
			seed_default_rates: false,
		});
		const endpoints = plugin.endpoints as Record<
			string,
			((context: unknown) => Promise<unknown>) | undefined
		>;
		const context = {
			context: { session: { user: { id: "usr_admin", role: "admin" } } },
			json: (payload: unknown) => payload,
		};

		const result = await endpoints.listUsageRates?.(context);

		expect(ensureDefaults).toHaveBeenCalledWith({
			plan_tiers: ["free"],
			unit: "request",
		});
		expect(result).toEqual({ rates: [] });
	});
});
