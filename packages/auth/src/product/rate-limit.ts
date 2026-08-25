import type { RateLimit } from "./types";

export const RATE_LIMIT = {
	// Free user tier: 10 requests per minute
	free: { max: 10, timeWindow: 60_000 },
	// Hobby plan: 60 requests per minute
	hobby: { max: 60, timeWindow: 60_000 },
	// Pro plan: 300 requests per minute
	pro: { max: 300, timeWindow: 60_000 },
	// Business plan: 1000 requests per minute
	business: { max: 1000, timeWindow: 60_000 },

	// paid
	paid: { max: 60, timeWindow: 60_000 },
} as const satisfies RateLimit;
