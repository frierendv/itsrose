import { buildRollupRows } from "../src/application/flush";
import { tenantIdForUser } from "../src/keys";
import type { UsageDayTenantSnapshot, UsageEndpointWeight } from "../src/types";

const weight: UsageEndpointWeight = {
	endpoint: "*",
	unit: "request",
	weight_micro: 1_000_000,
	weights_version: 1,
	effective_from: new Date(0),
	effective_to: null,
};

const heavyWeight: UsageEndpointWeight = {
	...weight,
	endpoint: "/audio/text-to-speech",
	weight_micro: 4_000_000,
	weights_version: 2,
};

const snapshot: UsageDayTenantSnapshot = {
	tenant_id: "11111111-1111-5111-8111-111111111111",
	requests_total: 10,
	requests_ok: 8,
	latency_ms_sum: 2_000,
	endpoints: [
		{
			endpoint: "/audio/text-to-speech",
			requests_total: 3,
			requests_ok: 3,
		},
		{ endpoint: "/status", requests_total: 5, requests_ok: 5 },
	],
	api_keys: [{ api_key_id: "key-1", requests_ok: 6 }],
};

function build() {
	return buildRollupRows({
		snapshot,
		day: "2026-01-15",
		unit: "request",
		source: "flush",
		weights: [weight, heavyWeight],
	});
}

describe("buildRollupRows", () => {
	it("emits the tenant, endpoint and api-key row kinds", () => {
		const rows = build();
		expect(rows).toHaveLength(4);
		expect(rows.map((row) => `${row.endpoint}|${row.api_key_id}`)).toEqual([
			"*|",
			"/audio/text-to-speech|",
			"/status|",
			"*|key-1",
		]);
	});

	it("stamps the day on every row", () => {
		for (const row of build()) {
			expect(row.day).toBe("2026-01-15");
		}
	});

	it("keeps totals and latency on the tenant row", () => {
		const [tenantRow] = build();
		expect(tenantRow).toMatchObject({
			endpoint: "*",
			api_key_id: "",
			requests_total: 10,
			requests_ok: 8,
			latency_ms_sum: 2_000,
			units_micro: 8_000_000,
			weights_version: 1,
		});
	});

	it("applies the endpoint weight to endpoint rows only", () => {
		const rows = build();
		const heavy = rows.find(
			(row) => row.endpoint === "/audio/text-to-speech"
		);
		const light = rows.find((row) => row.endpoint === "/status");

		expect(heavy).toMatchObject({
			requests_ok: 3,
			requests_total: 3,
			units_micro: 12_000_000,
			weights_version: 2,
			latency_ms_sum: 0,
		});
		expect(light).toMatchObject({
			requests_ok: 5,
			units_micro: 5_000_000,
			weights_version: 1,
		});
	});

	it("never double counts units across row kinds", () => {
		const rows = build();
		const endpointUnits = rows
			.filter((row) => row.endpoint !== "*" && row.api_key_id === "")
			.reduce((sum, row) => sum + row.units_micro, 0);

		expect(endpointUnits).toBe(17_000_000);
	});
});

describe("tenant id derivation", () => {
	it("produces a v5 uuid", () => {
		expect(tenantIdForUser("usr_abc")).toMatch(
			/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
		);
	});
});
