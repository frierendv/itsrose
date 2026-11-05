import { SHARED_ENV_KEYS, type SharedEnv } from "@itsrose/auth";
import { BILLING_ENV, BILLING_ENV_KEYS } from "@itsrose/auth-billing";
import { MAILER_ENV, MAILER_ENV_KEYS } from "@itsrose/auth-mailer/env";
import {
	CHARACTER_AI_ENV,
	CHARACTER_AI_ENV_KEYS,
} from "@itsrose/character-ai/env";
import { ELEVENLABS_ENV, ELEVENLABS_ENV_KEYS } from "@itsrose/elevenlabs/env";
import { MIDTRANS_ENV, MIDTRANS_ENV_KEYS } from "@itsrose/midtrans/env";
import { MTXX_ENV, MTXX_ENV_KEYS } from "@itsrose/mtxx/env";
import { REMINI_ENV, REMINI_ENV_KEYS } from "@itsrose/remini/env";
import { TIKTOK_ENV, TIKTOK_ENV_KEYS } from "@itsrose/tiktok/env";

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
	...SHARED_ENV_KEYS,
	...USAGE_ENV_KEYS,
	...MIDTRANS_ENV_KEYS,
	...MAILER_ENV_KEYS,
	...BILLING_ENV_KEYS,
	...ELEVENLABS_ENV_KEYS,
	...TIKTOK_ENV_KEYS,
	...MTXX_ENV_KEYS,
	...CHARACTER_AI_ENV_KEYS,
	...REMINI_ENV_KEYS,
] as const;

export type ApiEnv = SharedEnv<typeof ENVS>;

/** Package-owned key objects, reused for named access. */
export const PACKAGE_ENV = {
	billing: BILLING_ENV,
	characterAi: CHARACTER_AI_ENV,
	elevenlabs: ELEVENLABS_ENV,
	mailer: MAILER_ENV,
	midtrans: MIDTRANS_ENV,
	mtxx: MTXX_ENV,
	remini: REMINI_ENV,
	tiktok: TIKTOK_ENV,
} as const;

/** Package-owned key groups, reused by the boot-time validator. */
export const PACKAGE_ENV_KEYS = {
	billing: BILLING_ENV_KEYS,
	characterAi: CHARACTER_AI_ENV_KEYS,
	elevenlabs: ELEVENLABS_ENV_KEYS,
	mailer: MAILER_ENV_KEYS,
	midtrans: MIDTRANS_ENV_KEYS,
	mtxx: MTXX_ENV_KEYS,
	remini: REMINI_ENV_KEYS,
	tiktok: TIKTOK_ENV_KEYS,
	usage: USAGE_ENV_KEYS,
} as const;
