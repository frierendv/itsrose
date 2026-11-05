import { SHARED_ENV_KEYS, type SharedEnv } from "@itsrose/auth";

export const ENVS = [
	"PORT",
	...SHARED_ENV_KEYS,
	/** `soft` (default) or `hard` quota enforcement. */
	"USAGE_QUOTA_ENFORCEMENT",
	/** In-process flush interval in seconds; `0`/unset disables it. */
	"USAGE_FLUSH_INTERVAL_SECONDS",
] as const;

export type ApiEnv = SharedEnv<typeof ENVS>;
