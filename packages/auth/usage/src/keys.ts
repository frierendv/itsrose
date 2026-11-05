import { createHash } from "node:crypto";
import {
	USAGE_AUTH_ENDPOINT,
	USAGE_COUNTER_TTL_SECONDS,
	USAGE_DOCS_ENDPOINT,
	USAGE_PERIOD_TTL_SECONDS,
	USAGE_TENANT_NAMESPACE,
	USAGE_UNMATCHED_ENDPOINT,
} from "./constants";

/* -------------------------------------------------------------------------- */
/*                              Tenant identity                               */
/* -------------------------------------------------------------------------- */

/**
 * Derives a user's personal tenant id (RFC 4122 version 5, SHA-1).
 *
 * Better Auth generates `uuid` primary keys for plugin tables
 * (`advanced.database.generateId: "uuid"`), so the tenant id has to be a valid
 * UUID. Deriving it from the user id keeps the request hot path free of any
 * tenant lookup; `tenants.owner_user_id` keeps the reverse mapping for
 * settlement and admin views.
 */
export function tenantIdForUser(userId: string): string {
	const namespaceBytes = uuidToBytes(USAGE_TENANT_NAMESPACE);
	const nameBytes = Buffer.from(`itsrose:usage:user:${userId}`, "utf8");
	const digest = createHash("sha1")
		.update(Buffer.concat([namespaceBytes, nameBytes]))
		.digest();
	const bytes = Buffer.from(digest.subarray(0, 16));
	bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x50;
	bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
	return bytesToUuid(bytes);
}

function uuidToBytes(uuid: string): Buffer {
	const hex = uuid.replace(/-/g, "");
	if (hex.length !== 32) {
		throw new Error(`Invalid UUID namespace: ${uuid}`);
	}
	return Buffer.from(hex, "hex");
}

function bytesToUuid(bytes: Buffer): string {
	const hex = bytes.toString("hex");
	return [
		hex.slice(0, 8),
		hex.slice(8, 12),
		hex.slice(12, 16),
		hex.slice(16, 20),
		hex.slice(20, 32),
	].join("-");
}

/* -------------------------------------------------------------------------- */
/*                              Day / period                                  */
/* -------------------------------------------------------------------------- */

function pad(value: number, size = 2): string {
	return String(value).padStart(size, "0");
}

/** UTC day string (`YYYY-MM-DD`) for a date. */
export function utcDayString(date: Date = new Date()): string {
	return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(
		date.getUTCDate()
	)}`;
}

/** UTC midnight of the day `offsetDays` before `now`. */
export function utcDayDate(offsetDays: number, now: Date = new Date()): Date {
	const date = new Date(now.getTime());
	date.setUTCHours(0, 0, 0, 0);
	date.setUTCDate(date.getUTCDate() - offsetDays);
	return date;
}

/** Inclusive list of UTC day strings, oldest first. */
export function utcDayRange(days: number, now: Date = new Date()): string[] {
	const safeDays = Math.max(1, Math.trunc(days));
	return Array.from({ length: safeDays }, (_, index) =>
		utcDayString(utcDayDate(safeDays - 1 - index, now))
	);
}

/** Period string (`YYYY-MM`) for a date. */
export function periodString(date: Date = new Date()): string {
	return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}`;
}

/** First instant of a `YYYY-MM` period. */
export function periodStartDate(period: string): Date {
	return new Date(`${period}-01T00:00:00.000Z`);
}

/** First instant of the period after `YYYY-MM` (exclusive upper bound). */
export function periodEndDate(period: string): Date {
	const start = periodStartDate(period);
	return new Date(
		Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1)
	);
}

/** Period string of the month before `now`. */
export function previousPeriodString(now: Date = new Date()): string {
	return periodString(
		new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1))
	);
}

/** First instant of the next period, used for quota reset headers. */
export function nextPeriodStartDate(now: Date = new Date()): Date {
	return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
}

/** Inclusive UTC day bounds of a period: `[start, end)` day strings. */
export function periodDayBounds(period: string): {
	start: string;
	end: string;
} {
	const endDate = periodEndDate(period);
	return { start: `${period}-01`, end: utcDayString(endDate) };
}

/* -------------------------------------------------------------------------- */
/*                                Redis keys                                  */
/* -------------------------------------------------------------------------- */

const NAMESPACE = "usage";

export type UsageDayKeys = {
	requests: string;
	requestsOk: string;
	latencyMs: string;
	endpoints: string;
	apiKeys: string;
};

/** Index of every tenant that produced traffic on a given UTC day. */
export function usageDayTenantIndexKey(day: string): string {
	return `${NAMESPACE}:${day}:tenants`;
}

export function usageDayKeys(tenantId: string, day: string): UsageDayKeys {
	const base = `${NAMESPACE}:${tenantId}:${day}`;
	return {
		requests: `${base}:requests`,
		requestsOk: `${base}:requests_ok`,
		latencyMs: `${base}:latency_ms`,
		endpoints: `${base}:endpoints`,
		apiKeys: `${base}:api_keys`,
	};
}

export function usageEndpointTotalKey(
	tenantId: string,
	day: string,
	endpoint: string
): string {
	return `${NAMESPACE}:${tenantId}:${day}:ep:${endpoint}:requests`;
}

export function usageEndpointKey(
	tenantId: string,
	day: string,
	endpoint: string
): string {
	return `${NAMESPACE}:${tenantId}:${day}:ep:${endpoint}:requests_ok`;
}

export function usageApiKeyKey(
	tenantId: string,
	day: string,
	apiKeyId: string
): string {
	return `${NAMESPACE}:${tenantId}:${day}:key:${apiKeyId}:requests_ok`;
}

export function usageMonthQuotaKey(tenantId: string, period: string): string {
	return `${NAMESPACE}:${tenantId}:${period}:quota_used`;
}

/**
 * Pre-migration key layout, still written for one release so the dashboard
 * keeps its history while old keys age out (90 day TTL).
 */
export function usageLegacyCountKey(userId: string, day: string): string {
	return `${NAMESPACE}:${userId}:${day}:count`;
}

export function usageLegacyLatencyKey(userId: string, day: string): string {
	return `${NAMESPACE}:${userId}:${day}:latency_ms`;
}

/** TTLs per key family. Used by the Redis adapter only. */
export const USAGE_KEY_TTL = {
	day: USAGE_COUNTER_TTL_SECONDS,
	period: USAGE_PERIOD_TTL_SECONDS,
} as const;

/* -------------------------------------------------------------------------- */
/*                          Endpoint normalization                            */
/* -------------------------------------------------------------------------- */

export type UsageEndpointInput = {
	/** Fastify route template (`request.routeOptions.url`). */
	route_url?: string | null;
	/** Raw request url, used only to classify unmatched traffic. */
	url?: string | null;
};

/**
 * Normalizes a request into a bounded `endpoint` dimension.
 *
 * Always prefers the Fastify route template: raw URLs contain ids, query
 * strings and occasionally secrets, and would shatter the dimension into
 * unbounded cardinality.
 */
export function normalizeEndpoint(input: UsageEndpointInput): string {
	const routeUrl = input.route_url?.trim();
	if (routeUrl && routeUrl.length > 0) {
		if (routeUrl.startsWith("/auth")) {
			return USAGE_AUTH_ENDPOINT;
		}
		if (routeUrl.startsWith("/docs")) {
			return USAGE_DOCS_ENDPOINT;
		}
		return routeUrl;
	}

	const rawUrl = input.url?.trim() ?? "";
	if (rawUrl.startsWith("/auth")) {
		return USAGE_AUTH_ENDPOINT;
	}
	return USAGE_UNMATCHED_ENDPOINT;
}

/**
 * `true` when the endpoint should be exempt from metering (Better Auth's own
 * traffic and the generated docs UI).
 */
export function isExcludedEndpoint(endpoint: string): boolean {
	return endpoint === USAGE_AUTH_ENDPOINT || endpoint === USAGE_DOCS_ENDPOINT;
}
