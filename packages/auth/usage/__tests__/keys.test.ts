import {
	USAGE_AUTH_ENDPOINT,
	USAGE_DOCS_ENDPOINT,
	USAGE_UNMATCHED_ENDPOINT,
} from "../src/constants";
import {
	isExcludedEndpoint,
	nextPeriodStartDate,
	normalizeEndpoint,
	periodDayBounds,
	periodEndDate,
	periodStartDate,
	periodString,
	previousPeriodString,
	tenantIdForUser,
	usageApiKeyKey,
	usageDayKeys,
	usageDayTenantIndexKey,
	usageEndpointKey,
	usageEndpointTotalKey,
	usageLegacyCountKey,
	usageLegacyLatencyKey,
	usageMonthQuotaKey,
	utcDayDate,
	utcDayRange,
	utcDayString,
} from "../src/keys";

describe("tenant ids", () => {
	it("derives a stable UUIDv5 from the user id", () => {
		const tenantId = tenantIdForUser("user-1");
		expect(tenantId).toMatch(/^[0-9a-f-]{36}$/);
		expect(tenantId[14]).toBe("5");
		expect(tenantIdForUser("user-1")).toBe(tenantId);
		expect(tenantIdForUser("user-2")).not.toBe(tenantId);
	});
});

describe("day helpers", () => {
	const now = new Date("2026-11-05T23:30:00.000Z");

	it("formats UTC days", () => {
		expect(utcDayString(now)).toBe("2026-11-05");
		expect(utcDayString(new Date("2026-11-05T00:00:00.000Z"))).toBe(
			"2026-11-05"
		);
	});

	it("offsets UTC days", () => {
		expect(utcDayDate(0, now).toISOString()).toBe(
			"2026-11-05T00:00:00.000Z"
		);
		// Positive offsets move into the past, matching `utcDayRange`.
		expect(utcDayDate(1, now).toISOString()).toBe(
			"2026-11-04T00:00:00.000Z"
		);
	});

	it("builds ascending day ranges", () => {
		expect(utcDayRange(3, now)).toEqual([
			"2026-11-03",
			"2026-11-04",
			"2026-11-05",
		]);
		expect(utcDayRange(0, now)).toEqual(["2026-11-05"]);
	});
});

describe("period helpers", () => {
	const now = new Date("2026-11-05T12:00:00.000Z");

	it("formats and bounds periods", () => {
		expect(periodString(now)).toBe("2026-11");
		expect(periodStartDate("2026-11").toISOString()).toBe(
			"2026-11-01T00:00:00.000Z"
		);
		expect(periodEndDate("2026-11").toISOString()).toBe(
			"2026-12-01T00:00:00.000Z"
		);
		expect(periodDayBounds("2026-11")).toEqual({
			start: "2026-11-01",
			end: "2026-12-01",
		});
	});

	it("moves between periods", () => {
		expect(previousPeriodString(now)).toBe("2026-10");
		expect(previousPeriodString(new Date("2026-01-10T00:00:00.000Z"))).toBe(
			"2025-12"
		);
		expect(nextPeriodStartDate(now).toISOString()).toBe(
			"2026-12-01T00:00:00.000Z"
		);
	});
});

describe("redis key builders", () => {
	it("namespaces usage keys", () => {
		expect(usageDayTenantIndexKey("2026-11-05")).toBe(
			"usage:2026-11-05:tenants"
		);
		expect(usageDayKeys("tenant-1", "2026-11-05")).toEqual({
			requests: "usage:tenant-1:2026-11-05:requests",
			requestsOk: "usage:tenant-1:2026-11-05:requests_ok",
			latencyMs: "usage:tenant-1:2026-11-05:latency_ms",
			endpoints: "usage:tenant-1:2026-11-05:endpoints",
			apiKeys: "usage:tenant-1:2026-11-05:api_keys",
		});
		expect(usageEndpointTotalKey("tenant-1", "2026-11-05", "/status")).toBe(
			"usage:tenant-1:2026-11-05:ep:/status:requests"
		);
		expect(usageEndpointKey("tenant-1", "2026-11-05", "/status")).toBe(
			"usage:tenant-1:2026-11-05:ep:/status:requests_ok"
		);
		expect(usageApiKeyKey("tenant-1", "2026-11-05", "key-1")).toBe(
			"usage:tenant-1:2026-11-05:key:key-1:requests_ok"
		);
		expect(usageMonthQuotaKey("tenant-1", "2026-11")).toBe(
			"usage:tenant-1:2026-11:quota_used"
		);
		expect(usageLegacyCountKey("user-1", "2026-11-05")).toBe(
			"usage:user-1:2026-11-05:count"
		);
		expect(usageLegacyLatencyKey("user-1", "2026-11-05")).toBe(
			"usage:user-1:2026-11-05:latency_ms"
		);
	});
});

describe("endpoint normalization", () => {
	it("prefers the route template", () => {
		expect(normalizeEndpoint({ route_url: "/status" })).toBe("/status");
		expect(normalizeEndpoint({ route_url: "  /api/v1/x  " })).toBe(
			"/api/v1/x"
		);
		expect(normalizeEndpoint({ route_url: "/auth/session" })).toBe(
			USAGE_AUTH_ENDPOINT
		);
		expect(normalizeEndpoint({ route_url: "/docs" })).toBe(
			USAGE_DOCS_ENDPOINT
		);
	});

	it("falls back to the raw url", () => {
		expect(
			normalizeEndpoint({ route_url: null, url: "/auth/sign-in" })
		).toBe(USAGE_AUTH_ENDPOINT);
		expect(normalizeEndpoint({ route_url: "", url: "/unknown" })).toBe(
			USAGE_UNMATCHED_ENDPOINT
		);
		expect(normalizeEndpoint({})).toBe(USAGE_UNMATCHED_ENDPOINT);
	});

	it("excludes auth and docs endpoints", () => {
		expect(isExcludedEndpoint(USAGE_AUTH_ENDPOINT)).toBe(true);
		expect(isExcludedEndpoint(USAGE_DOCS_ENDPOINT)).toBe(true);
		expect(isExcludedEndpoint("/status")).toBe(false);
		expect(isExcludedEndpoint(USAGE_UNMATCHED_ENDPOINT)).toBe(false);
	});
});
