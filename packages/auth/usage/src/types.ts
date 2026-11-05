/**
 * Outcome class of a response, used to separate billable traffic from errors.
 */
export type UsageStatusClass = "2xx" | "3xx" | "4xx" | "5xx";

/**
 * One metered request, as seen by the host application's `onResponse` hook.
 */
export type UsageRecord = {
	/** Tenant the request is attributed to. */
	tenant_id: string;
	/** User that made the request (attribution dimension, never the scope). */
	user_id: string;
	/** API key used, when the request authenticated with one. */
	api_key_id: string | null;
	/** Fastify route template, see `normalizeEndpoint`. */
	endpoint: string;
	status_class: UsageStatusClass;
	/** Response time in milliseconds. */
	latency_ms: number;
	/** When the request completed. Defaults to `new Date()`. */
	at?: Date;
};

/**
 * Single day request bucket.
 */
export type UsageDayCount = {
	/** ISO date (`YYYY-MM-DD`, UTC). */
	date: string;
	count: number;
};

/**
 * Aggregated API usage statistics for a single tenant.
 *
 * All fields are `snake_case` per the monorepo API convention.
 */
export type UsageStats = {
	/** Total authenticated requests in the aggregation window. */
	total_requests: number;
	/** Mean response latency in milliseconds. */
	avg_latency_ms: number;
	/** Daily request counts, oldest first. */
	requests_by_day: UsageDayCount[];
};

/**
 * Window summary for a tenant.
 */
export type UsageWindowSummary = {
	tenant_id: string;
	window_days: number;
	/** All requests, including 4xx/5xx. */
	total_requests: number;
	/** Billable requests (2xx/3xx). */
	requests_ok: number;
	avg_latency_ms: number;
};

/**
 * One day of tenant traffic.
 */
export type UsageTimeseriesPoint = {
	date: string;
	requests_total: number;
	requests_ok: number;
};

export type UsageBreakdownDimension = "endpoint" | "api_key";

export type UsageBreakdownSlice = {
	dimension: UsageBreakdownDimension;
	/** Route template or API key id. */
	key: string;
	requests_ok: number;
};

/**
 * Quota state for the current period.
 */
export type UsageQuotaSnapshot = {
	tenant_id: string;
	period: string;
	used: number;
	/** `null` means unlimited. */
	limit: number | null;
	/** `null` means unlimited. */
	remaining: number | null;
	/** ISO timestamp of the next period start. */
	reset_at: string;
	mode: UsageQuotaMode;
	enforced: boolean;
};

export type UsageQuotaMode = "soft" | "hard";

/* -------------------------------------------------------------------------- */
/*                                  Rollups                                   */
/* -------------------------------------------------------------------------- */

/**
 * One durable rollup row: a day of traffic for a tenant/endpoint/api-key/unit.
 */
export type UsageRollupRow = {
	tenant_id: string;
	/** UTC day string (`YYYY-MM-DD`). */
	day: string;
	endpoint: string;
	/** Empty string when the traffic was not keyed. */
	api_key_id: string;
	unit: string;
	requests_total: number;
	requests_ok: number;
	latency_ms_sum: number;
	units_micro: number;
	weights_version: number;
	source: string;
};

/**
 * Aggregated traffic of one tenant over one period.
 *
 * Rollups store three kinds of rows: the tenant row (`endpoint = "*"`,
 * `api_key_id = ""`), per-endpoint rows (settlement input) and per-key rows
 * (dashboard dimensions). Summing all of them would double count, so the SQL
 * aggregates them separately: `upsertRollups` keeps them distinct and
 * settlement prefers the per-endpoint totals, falling back to the tenant row
 * for periods that only have a backfilled aggregate.
 */
export type UsageTenantPeriod = {
	tenant_id: string;
	/** All requests, from the tenant row. */
	requests_total: number;
	/** Billable requests attributed per endpoint (settlement input). */
	requests_ok: number;
	/** Weighted units per endpoint, in micro-units (settlement input). */
	units_micro: number;
	/** Billable requests from the tenant row (backfill fallback). */
	fallback_requests_ok: number;
	/** Weighted units from the tenant row (backfill fallback). */
	fallback_units_micro: number;
	latency_ms_sum: number;
};

/* -------------------------------------------------------------------------- */
/*                            Rates and weights                               */
/* -------------------------------------------------------------------------- */

export type UsageUnitRate = {
	id: string;
	unit: string;
	plan_tier: string;
	/** Price in IDR per whole unit. */
	amount: number;
	currency: "IDR";
	/** Monotonic version stamped on settlements; epoch milliseconds. */
	rates_version: number;
	effective_from: Date | string;
	effective_to: Date | string | null;
	created_at?: Date | string;
	created_by?: string | null;
};

export type UsageEndpointWeight = {
	endpoint: string;
	unit: string;
	/** Weight in micro-units: `1_000_000` = one whole unit. */
	weight_micro: number;
	weights_version: number;
	effective_from: Date | string;
	effective_to: Date | string | null;
};

/* -------------------------------------------------------------------------- */
/*                              Settlements                                   */
/* -------------------------------------------------------------------------- */

export type UsageSettlement = {
	id?: string;
	tenant_id: string;
	/** `YYYY-MM`. */
	period: string;
	unit: string;
	requests: number;
	units_micro: number;
	rates_version: number | null;
	unit_rate_id: string | null;
	/** Frozen invoice amount in IDR. */
	amount: number;
	invoice_id: string | null;
	/** Deterministic hash of the inputs, used to detect drift. */
	checksum: string;
	computed_at?: Date | string;
};

/* -------------------------------------------------------------------------- */
/*                                  Ports                                     */
/* -------------------------------------------------------------------------- */

/**
 * Hot-path counters and read-side aggregates (Redis today).
 */
export type UsageCounterPort = {
	record: (event: UsageRecord) => Promise<void>;
	/**
	 * Legacy-compatible 30 day stats. `user_id` enables the dual-read merge
	 * with the pre-migration per-user key layout.
	 */
	getStats: (tenant_id: string, user_id?: string) => Promise<UsageStats>;
	getSummary: (
		tenant_id: string,
		window_days: number
	) => Promise<UsageWindowSummary>;
	getTimeseries: (
		tenant_id: string,
		window_days: number
	) => Promise<UsageTimeseriesPoint[]>;
	getBreakdown: (
		tenant_id: string,
		dimension: UsageBreakdownDimension,
		window_days: number
	) => Promise<UsageBreakdownSlice[]>;
	/** Billable requests consumed in a period, used for quota accounting. */
	getQuotaUsed: (tenant_id: string, period: string) => Promise<number>;
};

/**
 * Per-day snapshot of a tenant's traffic, read from the hot counters and
 * written into the durable ledger by the flush job.
 */
export type UsageDayTenantSnapshot = {
	tenant_id: string;
	requests_total: number;
	requests_ok: number;
	latency_ms_sum: number;
	endpoints: Array<{
		endpoint: string;
		requests_total: number;
		requests_ok: number;
	}>;
	api_keys: Array<{ api_key_id: string; requests_ok: number }>;
};

/**
 * Read side of the hot counters used by the flush/backfill job.
 */
export type UsageDayReaderPort = {
	listTenantIds: (day: string) => Promise<string[]>;
	readTenantDay: (
		tenant_id: string,
		day: string
	) => Promise<UsageDayTenantSnapshot>;
};

/**
 * Durable ledger (Postgres). Satisfies the billing durability gate.
 */
export type UsageLedgerPort = {
	/** Monotonic, idempotent upsert; returns the number of written rows. */
	upsertRollups: (rows: readonly UsageRollupRow[]) => Promise<number>;
	readPeriod: (
		tenant_id: string,
		period: string
	) => Promise<UsageRollupRow[]>;
	listTenantsWithUsage: (period: string) => Promise<UsageTenantPeriod[]>;
	insertSettlement: (
		settlement: UsageSettlement
	) => Promise<{ settlement: UsageSettlement; created: boolean }>;
	listSettlements: (filter?: {
		tenant_id?: string;
		period?: string;
		limit?: number;
	}) => Promise<UsageSettlement[]>;
	updateSettlementInvoice: (
		tenant_id: string,
		period: string,
		unit: string,
		invoice_id: string
	) => Promise<void>;
};

export type UsageRateStorePort = {
	resolveAt: (
		plan_tier: string,
		unit: string,
		at: Date
	) => Promise<UsageUnitRate | null>;
	listOpen: () => Promise<UsageUnitRate[]>;
	/**
	 * Creates a new rate version, closing the open row for the same
	 * tier/unit in the same statement, and records an audit row.
	 */
	setRate: (input: {
		plan_tier: string;
		unit: string;
		amount: number;
		effective_from?: Date;
		created_by?: string | null;
	}) => Promise<UsageUnitRate>;
	listWeights: (at: Date) => Promise<UsageEndpointWeight[]>;
	ensureDefaults: (input: {
		plan_tiers: readonly string[];
		unit: string;
	}) => Promise<void>;
};

/**
 * Resolves the tenant a session user is metered under.
 */
export type TenantResolverPort = {
	forUser: (user_id: string) => Promise<{ tenant_id: string }>;
};

/**
 * Creates the durable tenant rows the ledger references.
 *
 * New users get their row from the signup hook in the auth composition root;
 * this port backfills users that existed before the feature shipped.
 */
export type TenantSyncPort = {
	ensureAll: () => Promise<{ scanned: number; created: number }>;
};

/**
 * Entitlement input for a tenant.
 */
export type UsageTenantInfo = {
	tenant_id: string;
	user_id: string | null;
	plan_tier: string;
	/** `null` means unlimited. */
	quota_requests: number | null;
};

export type UsagePlanPort = {
	forTenant: (tenant_id: string) => Promise<UsageTenantInfo | null>;
};

export type UsageInvoiceLine = {
	item_id: string;
	description: string;
	price: number;
	quantity: number;
};

export type UsageInvoiceInput = {
	tenant_id: string;
	user_id: string;
	period: string;
	unit: string;
	lines: readonly UsageInvoiceLine[];
	amount: number;
	idempotency_key: string;
	notes?: string;
};

/**
 * Creates the provider invoice for a settled period.
 */
export type UsageInvoicePort = {
	create: (input: UsageInvoiceInput) => Promise<{ invoice_id: string }>;
};

/**
 * Clock port, kept local so the usage package stays independent of billing.
 */
export type UsageClockPort = {
	now: () => Date;
};

/* -------------------------------------------------------------------------- */
/*                          Settlement results                                */
/* -------------------------------------------------------------------------- */

export type SettlementTenantStatus = "settled" | "skipped" | "failed";

export type SettlementTenantResult = {
	tenant_id: string;
	plan_tier: string | null;
	requests: number;
	units_micro: number;
	amount: number;
	unit_rate_id: string | null;
	rates_version: number | null;
	status: SettlementTenantStatus;
	reason?: string;
	created: boolean;
	invoice_id: string | null;
};

export type SettlementResult = {
	period: string;
	unit: string;
	tenants: SettlementTenantResult[];
	totals: {
		tenants: number;
		units_micro: number;
		amount: number;
		invoices_created: number;
		skipped: number;
		failed: number;
	};
};

/* -------------------------------------------------------------------------- */
/*                            Flush results                                   */
/* -------------------------------------------------------------------------- */

export type FlushUsageResult = {
	days: string[];
	tenants: number;
	rows: number;
	written: number;
};
