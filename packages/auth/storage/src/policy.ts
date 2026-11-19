import { StorageValidationError } from "@itsrose/s3";
import { ASSET_ROOT, EPHEMERAL_ROOT } from "./keys";

/* -------------------------------------------------------------------------- */
/*                                Asset kinds                                 */
/* -------------------------------------------------------------------------- */

/**
 * The closed list of durable asset kinds. The kind is the policy carrier in a
 * key, so a new kind must be added here before a builder accepts it.
 */
export const ASSET_KINDS = ["voice_sample", "image", "audio", "video"] as const;

export type AssetKind = (typeof ASSET_KINDS)[number];

/**
 * A storage class answers the same questions for every prefix: which root the
 * object lives in, how a read URL is minted, how long the object survives, and
 * whether its bytes count against the storage entitlement.
 */
export type AssetStorageClass = "durable" | "scratch" | "generated";

/** The two bucket roots. `assets` is durable; `t` is the lifecycle root. */
export type AssetStorageRoot = typeof ASSET_ROOT | typeof EPHEMERAL_ROOT;

export type AssetUrlMode = "signed" | "public";

export interface AssetPolicy {
	/** Bucket root the class is written under. */
	root: AssetStorageRoot;
	/** How a read URL for an object in this class is minted. */
	urlMode: AssetUrlMode;
	/**
	 * Signed read URL lifetime in seconds when {@link urlMode} is `"signed"`;
	 * `null` when the object is readable through a public URL.
	 */
	urlTtlSeconds: number | null;
	/**
	 * Object lifetime enforced by the bucket lifecycle rule in seconds;
	 * `null` when the object is durable and carries no lifecycle rule.
	 */
	lifetimeSeconds: number | null;
	/** Whether the object counts against the storage entitlement. */
	counted: boolean;
}

/** The signed read URL lifetime shared by durable and scratch objects. */
export const SIGNED_READ_TTL_SECONDS = 900;

/** The 1-day R2 lifecycle rule that owns the `t/` root. */
export const EPHEMERAL_LIFETIME_SECONDS = 86_400;

/**
 * One table for every storage class.
 *
 * - `durable`: user library assets under `assets/`, never expired by the
 *   bucket, signed reads, counted against the storage entitlement.
 * - `scratch`: a copy for one job under `t/`, expired after one day, signed
 *   reads, never counted.
 * - `generated`: API output under `t/`, expired after one day, public URL
 *   (D5), never counted.
 */
export const ASSET_POLICIES = {
	durable: {
		root: ASSET_ROOT,
		urlMode: "signed",
		urlTtlSeconds: SIGNED_READ_TTL_SECONDS,
		lifetimeSeconds: null,
		counted: true,
	},
	scratch: {
		root: EPHEMERAL_ROOT,
		urlMode: "signed",
		urlTtlSeconds: SIGNED_READ_TTL_SECONDS,
		lifetimeSeconds: EPHEMERAL_LIFETIME_SECONDS,
		counted: false,
	},
	generated: {
		root: EPHEMERAL_ROOT,
		urlMode: "public",
		urlTtlSeconds: null,
		lifetimeSeconds: EPHEMERAL_LIFETIME_SECONDS,
		counted: false,
	},
} as const satisfies Record<AssetStorageClass, AssetPolicy>;

/* -------------------------------------------------------------------------- */
/*                              Kind resolution                               */
/* -------------------------------------------------------------------------- */

/** The policy every durable asset kind resolves to. */
export type DurableAssetPolicy = (typeof ASSET_POLICIES)["durable"];

/**
 * Narrows a string to a known `AssetKind`.
 */
export function isAssetKind(value: string): value is AssetKind {
	return (ASSET_KINDS as readonly string[]).includes(value);
}

/**
 * Resolves the storage policy for an asset kind.
 *
 * Accepts a plain string because parsed keys and request payloads carry one;
 * an unknown kind throws instead of falling back to a default. Every kind
 * currently resolves to the durable class.
 */
export function assetPolicyFor(kind: string): DurableAssetPolicy {
	if (!isAssetKind(kind)) {
		throw new StorageValidationError(
			`Unknown asset kind "${kind}". Expected one of: ${ASSET_KINDS.join(", ")}.`
		);
	}

	return ASSET_POLICIES.durable;
}
