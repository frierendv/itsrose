export const USAGE_PLUGIN_ID = "usage";

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
