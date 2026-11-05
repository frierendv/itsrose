import {
	amountFor,
	evaluateQuota,
	isBillableStatus,
	resolveWeight,
	settlementChecksum,
	statusClassOf,
	unitsMicroFor,
} from "../src/domain/units";
import {
	normalizeEndpoint,
	periodDayBounds,
	previousPeriodString,
	tenantIdForUser,
	utcDayRange,
} from "../src/keys";

describe("status classes", () => {
	it("classifies response codes", () => {
		expect(statusClassOf(200)).toBe("2xx");
		expect(statusClassOf(204)).toBe("2xx");
		expect(statusClassOf(301)).toBe("3xx");
		expect(statusClassOf(401)).toBe("4xx");
		expect(statusClassOf(429)).toBe("4xx");
		expect(statusClassOf(503)).toBe("5xx");
	});

	it("bills only successful responses", () => {
		expect(isBillableStatus("2xx")).toBe(true);
		expect(isBillableStatus("3xx")).toBe(true);
		expect(isBillableStatus("4xx")).toBe(false);
		expect(isBillableStatus("5xx")).toBe(false);
	});
});

describe("tenant identity", () => {
	it("derives a stable uuid per user and distinct uuids across users", () => {
		const first = tenantIdForUser("usr_1");
		expect(first).toBe(tenantIdForUser("usr_1"));
		expect(first).not.toBe(tenantIdForUser("usr_2"));
		expect(first).toMatch(
			/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
		);
	});
});

describe("endpoint normalization", () => {
	it("prefers the route template", () => {
		expect(
			normalizeEndpoint({
				route_url: "/audio/text-to-speech",
				url: "/audio/text-to-speech?key=sk_live",
			})
		).toBe("/audio/text-to-speech");
	});

	it("collapses better auth and docs traffic", () => {
		expect(normalizeEndpoint({ route_url: "/auth/*" })).toBe("(auth)");
		expect(normalizeEndpoint({ route_url: "/docs/*" })).toBe("(docs)");
	});

	it("falls back to a sentinel for unmatched traffic", () => {
		expect(normalizeEndpoint({ url: "/unknown/path" })).toBe("(unmatched)");
	});
});

describe("day and period helpers", () => {
	it("builds an inclusive, oldest-first day range", () => {
		const days = utcDayRange(3, new Date("2026-03-02T10:00:00.000Z"));
		expect(days).toEqual(["2026-02-28", "2026-03-01", "2026-03-02"]);
	});

	it("maps a period to half-open day bounds", () => {
		expect(periodDayBounds("2026-02")).toEqual({
			start: "2026-02-01",
			end: "2026-03-01",
		});
	});

	it("resolves the previous closed period", () => {
		expect(previousPeriodString(new Date("2026-01-15T00:00:00.000Z"))).toBe(
			"2025-12"
		);
	});
});

describe("weighted units", () => {
	it("scales requests by the endpoint weight", () => {
		expect(unitsMicroFor(3, 1_000_000)).toBe(3_000_000);
		expect(unitsMicroFor(0, 1_000_000)).toBe(0);
	});

	it("prefers an exact endpoint weight over the default", () => {
		const weights = [
			{
				endpoint: "*",
				unit: "request",
				weight_micro: 1_000_000,
				weights_version: 1,
				effective_from: new Date(0),
				effective_to: null,
			},
			{
				endpoint: "/audio/text-to-speech",
				unit: "request",
				weight_micro: 5_000_000,
				weights_version: 2,
				effective_from: new Date(0),
				effective_to: null,
			},
		];

		expect(resolveWeight("/audio/text-to-speech", weights)).toEqual({
			weight_micro: 5_000_000,
			weights_version: 2,
		});
		expect(resolveWeight("/status", weights)).toEqual({
			weight_micro: 1_000_000,
			weights_version: 1,
		});
		expect(resolveWeight("/status", [])).toEqual({
			weight_micro: 1_000_000,
			weights_version: 1,
		});
	});
});

describe("money", () => {
	it("rounds half up exactly once per line", () => {
		expect(amountFor(1_000_000, 150)).toBe(150);
		expect(amountFor(1_500_000, 150)).toBe(225);
		expect(amountFor(500_000, 1)).toBe(1);
		expect(amountFor(0, 150)).toBe(0);
	});

	it("stays exact for large unit volumes", () => {
		expect(amountFor(1_500_000_000_000, 1)).toBe(1_500_000);
	});
});

describe("quota evaluation", () => {
	it("treats a null limit as unlimited", () => {
		const evaluation = evaluateQuota({
			used: 10,
			limit: null,
			mode: "hard",
		});
		expect(evaluation).toMatchObject({
			limit: null,
			remaining: null,
			exceeded: false,
			blocked: false,
		});
	});

	it("never blocks in soft mode", () => {
		const evaluation = evaluateQuota({
			used: 1000,
			limit: 1000,
			mode: "soft",
		});
		expect(evaluation.exceeded).toBe(true);
		expect(evaluation.blocked).toBe(false);
		expect(evaluation.remaining).toBe(0);
	});

	it("blocks in hard mode once the limit is reached", () => {
		const evaluation = evaluateQuota({
			used: 1000,
			limit: 1000,
			mode: "hard",
		});
		expect(evaluation.blocked).toBe(true);
	});

	it("defaults to soft mode", () => {
		expect(evaluateQuota({ used: 0, limit: 10 }).mode).toBe("soft");
	});
});

describe("settlement checksum", () => {
	it("is deterministic and sensitive to every input", () => {
		const base = {
			tenant_id: "t1",
			period: "2026-01",
			unit: "request",
			requests: 10,
			units_micro: 10_000_000,
			rates_version: 1,
			amount: 500,
		};
		expect(settlementChecksum(base)).toBe(settlementChecksum({ ...base }));
		expect(settlementChecksum(base)).not.toBe(
			settlementChecksum({ ...base, amount: 501 })
		);
	});
});
