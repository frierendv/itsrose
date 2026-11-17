import { API_ROUTE_ENV_KEYS } from "@itsrose/api-routes/env";
import { AUTH_ENV_KEYS, type AuthEnv } from "@itsrose/auth";
import { MIDTRANS_ENV_KEYS } from "@itsrose/midtrans";

/** Usage metering switches owned by this app. */
const USAGE_ENV_KEYS = [
	/** `soft` (default) or `hard` quota enforcement. */
	"USAGE_QUOTA_ENFORCEMENT",
	/** In-process rollup flush interval in seconds; `0`/unset disables it. */
	"USAGE_FLUSH_INTERVAL_SECONDS",
] as const;

/**
 * Every environment variable this app may read, aggregated from the packages
 * that own each name. This is the authoritative allowlist for `fastify.env`.
 */
export const ENVS = [
	"PORT",
	...AUTH_ENV_KEYS,
	...USAGE_ENV_KEYS,
	...MIDTRANS_ENV_KEYS,
	...API_ROUTE_ENV_KEYS,
] as const;
export { MIDTRANS_ENV_KEYS };
export type ApiEnv = AuthEnv<typeof ENVS>;
