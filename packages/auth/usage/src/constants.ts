export const USAGE_PLUGIN_ID = "usage";

/**
 * Plugin id used for the schema-only registration in `@itsrose/auth`.
 *
 * The transport plugin (`usagePlugin`) is registered by the host application,
 * which means `db:generate` never sees it. Registering the schema through a
 * separate, endpoint-free plugin in the auth composition root keeps the
 * generated SQL the single source of truth for DDL.
 */
export const USAGE_SCHEMA_PLUGIN_ID = "usage-schema";

/**
 * Number of days included in the aggregated totals.
 */
export const USAGE_WINDOW_DAYS = 30;

/**
 * Number of daily buckets returned in `requests_by_day`.
 */
export const USAGE_DAILY_BUCKETS = 7;

/**
 * Retention (seconds) for daily Redis counters: 90 days.
 */
export const USAGE_COUNTER_TTL_SECONDS = 90 * 24 * 60 * 60;

/**
 * Retention (seconds) for monthly quota counters: 100 days.
 */
export const USAGE_PERIOD_TTL_SECONDS = 100 * 24 * 60 * 60;

/**
 * Namespace UUID used to derive a user's personal tenant id (RFC 4122 v5).
 *
 * Better Auth generates `uuid` primary keys for every plugin table
 * (`generateId: "uuid"`), so the deterministic tenant id has to be a UUID. The
 * id is derived from the user id, which keeps the hot path lookup free: one
 * user has exactly one personal tenant until the `organization` plugin lands,
 * at which point organization tenants get real ids and membership resolves
 * through `tenant_members`.
 */
export const USAGE_TENANT_NAMESPACE = "b3f0c8a2-9d4e-4b1a-8f7c-2e5d6a1b0c93";

/**
 * Seeded metering unit. Additional units can be added later without a schema
 * change because the unit is a dimension on every rollup row.
 */
export const USAGE_UNIT_REQUEST = "request";

/**
 * Fixed-point scale for weighted units: `1_000_000` micro-units = 1 unit.
 *
 * Postgres columns are integers (Better Auth maps `number` to `integer`), so
 * fractional weights are represented as scaled integers end to end.
 */
export const USAGE_UNIT_MICRO_SCALE = 1_000_000;

/**
 * Weight applied to endpoints without a specific row.
 */
export const USAGE_DEFAULT_ENDPOINT = "*";

/**
 * Sentinel for "no API key" inside rollup unique indexes. Postgres treats
 * NULLs as distinct, so a nullable dimension would duplicate rollup rows.
 */
export const USAGE_EMPTY_API_KEY = "";

export const USAGE_SOURCE_FLUSH = "flush";
export const USAGE_SOURCE_BACKFILL = "redis_backfill";

export const USAGE_UNMATCHED_ENDPOINT = "(unmatched)";
export const USAGE_AUTH_ENDPOINT = "(auth)";
export const USAGE_DOCS_ENDPOINT = "(docs)";

export const USAGE_QUOTA_MODE_SOFT = "soft";
export const USAGE_QUOTA_MODE_HARD = "hard";

/**
 * Quota response headers. Kept separate from `x-ratelimit-*`, which belongs to
 * `@fastify/rate-limit` and describes per-minute limits, not period quotas.
 */
export const USAGE_QUOTA_HEADERS = {
	limit: "x-quota-limit",
	remaining: "x-quota-remaining",
	reset: "x-quota-reset",
	mode: "x-quota-mode",
	enforced: "x-quota-enforced",
} as const;

export const USAGE_UNLIMITED_HEADER_VALUE = "unlimited";

/**
 * Maximum number of days a single read query may span (the counter TTL).
 */
export const USAGE_MAX_WINDOW_DAYS = USAGE_COUNTER_TTL_SECONDS / 86_400;

/* -------------------------------------------------------------------------- */
/*                            Database tables                                 */
/* -------------------------------------------------------------------------- */

export const USAGE_DAILY_ROLLUPS_TABLE = "usage_daily_rollups";
export const USAGE_UNIT_RATES_TABLE = "usage_unit_rates";
export const USAGE_ENDPOINT_WEIGHTS_TABLE = "usage_endpoint_weights";
export const USAGE_RATE_AUDIT_TABLE = "usage_rate_audit";
export const USAGE_SETTLEMENTS_TABLE = "usage_settlements";
