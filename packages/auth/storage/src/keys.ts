import { StorageValidationError } from "@itsrose/s3";
import type { AssetKind } from "./policy";

export const EPHEMERAL_ROOT = "t" as const;
export const ASSET_ROOT = "assets" as const;

const USER_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;
const CATEGORY_PATTERN = /^[a-zA-Z0-9_-]+$/;
const JOB_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;

/**
 * Validates and sanitizes a userId to prevent path traversal or invalid keys.
 */
export function sanitizeUserId(userId: string): string {
	const trimmed = (userId || "").trim();
	if (!trimmed) {
		throw new StorageValidationError("userId cannot be empty.");
	}

	if (!USER_ID_PATTERN.test(trimmed)) {
		throw new StorageValidationError(
			`Invalid userId format "${trimmed}". Only alphanumeric, hyphen, and underscore characters are allowed.`
		);
	}

	return trimmed;
}

/**
 * Validates and sanitizes a jobId for API-generated artifacts.
 */
export function sanitizeJobId(jobId: string): string {
	const trimmed = (jobId || "").trim();
	if (!trimmed) {
		throw new StorageValidationError("jobId cannot be empty.");
	}

	if (!JOB_ID_PATTERN.test(trimmed)) {
		throw new StorageValidationError(
			`Invalid jobId format "${trimmed}". Only alphanumeric, hyphen, and underscore characters are allowed.`
		);
	}

	return trimmed;
}

/**
 * Validates and sanitizes storage category (e.g. "exports", "reports", "temp").
 */
export function sanitizeCategory(category: string): string {
	const trimmed = (category || "").trim().toLowerCase();
	if (!trimmed) {
		throw new StorageValidationError("Storage category cannot be empty.");
	}

	if (!CATEGORY_PATTERN.test(trimmed)) {
		throw new StorageValidationError(
			`Invalid storage category "${trimmed}". Only alphanumeric, hyphen, and underscore are allowed.`
		);
	}

	return trimmed;
}

/**
 * Sanitizes a file name, stripping directory traversal tokens and illegal characters.
 */
export function sanitizeFilename(filename: string): string {
	const clean = (filename || "")
		.trim()
		.split("")
		.filter((char) => {
			const code = char.charCodeAt(0);
			// Filter out control characters, quotes, and backslashes
			return (
				code >= 32 &&
				code !== 127 &&
				char !== '"' &&
				char !== "'" &&
				char !== "\\"
			);
		})
		.join("")
		.replace(/(^|\/)\.\.(?=\/|$)/g, "") // strip directory traversal
		.replace(/^\/+|\/+$/g, ""); // strip leading/trailing slashes

	if (!clean || clean === "." || clean === "..") {
		throw new StorageValidationError("Invalid or empty filename.");
	}

	// Normalize spaces to hyphens and collapse multiple dashes
	return clean.replace(/\s+/g, "-").replace(/-{2,}/g, "-");
}

/**
 * Builds the root prefix for all data belonging to a user under the 1-day retention root: `t/users/{userId}/`.
 */
export function buildUserPrefix(userId: string): string {
	return `${EPHEMERAL_ROOT}/users/${sanitizeUserId(userId)}/`;
}

/**
 * Builds the root prefix for all durable assets belonging to a user under the
 * `assets/` root, which carries no lifecycle rule:
 * `assets/users/{userId}/`.
 */
export function buildUserAssetPrefix(userId: string): string {
	return `${ASSET_ROOT}/users/${sanitizeUserId(userId)}/`;
}

/**
 * Builds the prefix for all API-generated artifacts belonging to a job: `t/artifacts/{jobId}/`.
 */
export function buildArtifactPrefix(jobId: string): string {
	return `${EPHEMERAL_ROOT}/artifacts/${sanitizeJobId(jobId)}/`;
}

export interface BuildUserEphemeralKeyParams {
	userId: string;
	category?: string;
	filename: string;
}

/**
 * Builds a user-scoped ephemeral key rooted in `t/` for Cloudflare R2 1-day lifecycle rules:
 * `t/users/{userId}/{category}/{filename}`.
 */
export function buildUserEphemeralKey(
	params: BuildUserEphemeralKeyParams
): string;
export function buildUserEphemeralKey(
	userId: string,
	category: string,
	filename: string
): string;
export function buildUserEphemeralKey(
	paramOrUserId: string | BuildUserEphemeralKeyParams,
	maybeCategory?: string,
	maybeFilename?: string
): string {
	const userId =
		typeof paramOrUserId === "string"
			? paramOrUserId
			: paramOrUserId.userId;
	const category =
		typeof paramOrUserId === "string"
			? (maybeCategory ?? "temp")
			: (paramOrUserId.category ?? "temp");
	const filename =
		typeof paramOrUserId === "string"
			? (maybeFilename ?? "")
			: paramOrUserId.filename;

	const validUserId = sanitizeUserId(userId);
	const validCategory = sanitizeCategory(category);
	const validFilename = sanitizeFilename(filename);

	return `${EPHEMERAL_ROOT}/users/${validUserId}/${validCategory}/${validFilename}`;
}

/**
 * Alias for {@link buildUserEphemeralKey}.
 */
export const buildUserFileKey = buildUserEphemeralKey;

export interface BuildArtifactKeyParams {
	jobId: string;
	filename: string;
}

/**
 * Builds an API-generated artifact key rooted in `t/`:
 * `t/artifacts/{jobId}/{filename}`.
 */
export function buildArtifactKey(params: BuildArtifactKeyParams): string;
export function buildArtifactKey(jobId: string, filename: string): string;
export function buildArtifactKey(
	paramOrJobId: string | BuildArtifactKeyParams,
	maybeFilename?: string
): string {
	const jobId =
		typeof paramOrJobId === "string" ? paramOrJobId : paramOrJobId.jobId;
	const filename =
		typeof paramOrJobId === "string"
			? (maybeFilename ?? "")
			: paramOrJobId.filename;

	const validJobId = sanitizeJobId(jobId);
	const validFilename = sanitizeFilename(filename);

	return `${EPHEMERAL_ROOT}/artifacts/${validJobId}/${validFilename}`;
}

/**
 * Builds a generic ephemeral key rooted in `t/`:
 * `t/{category}/{filename}`.
 */
export function buildEphemeralKey(category: string, filename: string): string {
	const validCategory = sanitizeCategory(category);
	const validFilename = sanitizeFilename(filename);
	return `${EPHEMERAL_ROOT}/${validCategory}/${validFilename}`;
}

export interface BuildUserAssetKeyParams {
	userId: string;
	kind: AssetKind;
	/**
	 * Server-generated asset identifier. It keeps two uploads of the same file
	 * name from colliding, so the client never names the object path.
	 */
	assetId: string;
	filename: string;
}

/**
 * Builds a durable user asset key rooted in `assets/`, which carries no
 * lifecycle rule:
 * `assets/users/{userId}/{kind}/{assetId}/{filename}`.
 *
 * The kind is the policy carrier, so it is a closed `AssetKind` rather
 * than a free-form category. Every segment passes through a sanitizer.
 */
export function buildUserAssetKey(params: BuildUserAssetKeyParams): string {
	const validUserId = sanitizeUserId(params.userId);
	const validKind = sanitizeCategory(params.kind);
	const validAssetId = sanitizeJobId(params.assetId);
	const validFilename = sanitizeFilename(params.filename);

	return `${ASSET_ROOT}/users/${validUserId}/${validKind}/${validAssetId}/${validFilename}`;
}

export type ParsedEphemeralKey =
	| { type: "user"; userId: string; category: string; filename: string }
	| { type: "artifact"; jobId: string; filename: string }
	| { type: "generic"; category: string; filename: string };

/**
 * Safely parses an ephemeral storage key rooted in `t/`.
 * Returns null if the key does not start with `t/` or does not match known ephemeral patterns.
 */
export function parseEphemeralKey(key: string): ParsedEphemeralKey | null {
	const clean = (key || "").replace(/^\/+|\/+$/g, "");
	const parts = clean.split("/");

	if (parts.length < 2 || parts[0] !== EPHEMERAL_ROOT) {
		return null;
	}

	const subParts = parts.slice(1);

	if (subParts[0] === "users" && subParts.length >= 4) {
		try {
			return {
				type: "user",
				userId: sanitizeUserId(subParts[1] ?? ""),
				category: sanitizeCategory(subParts[2] ?? ""),
				filename: sanitizeFilename(subParts.slice(3).join("/")),
			};
		} catch {
			return null;
		}
	}

	if (subParts[0] === "artifacts" && subParts.length >= 3) {
		try {
			return {
				type: "artifact",
				jobId: sanitizeJobId(subParts[1] ?? ""),
				filename: sanitizeFilename(subParts.slice(2).join("/")),
			};
		} catch {
			return null;
		}
	}

	if (subParts.length >= 2) {
		try {
			return {
				type: "generic",
				category: sanitizeCategory(subParts[0] ?? ""),
				filename: sanitizeFilename(subParts.slice(1).join("/")),
			};
		} catch {
			return null;
		}
	}

	return null;
}

export interface ParsedAssetKey {
	root: "asset";
	type: "asset";
	userId: string;
	kind: string;
	assetId: string;
	filename: string;
}

/**
 * Parses a durable asset key rooted in `assets/`:
 * `assets/users/{userId}/{kind}/{assetId}/{filename}`.
 *
 * The kind segment is returned as written (after sanitization); a caller that
 * acts on it must pass it to `assetPolicyFor`, which rejects an unknown kind.
 * Returning `null` here means the key is not a well-formed asset key.
 */
function parseAssetKey(key: string): ParsedAssetKey | null {
	const parts = key.split("/");

	if (parts.length < 6 || parts[0] !== ASSET_ROOT || parts[1] !== "users") {
		return null;
	}

	try {
		return {
			root: "asset",
			type: "asset",
			userId: sanitizeUserId(parts[2] ?? ""),
			kind: sanitizeCategory(parts[3] ?? ""),
			assetId: sanitizeJobId(parts[4] ?? ""),
			filename: sanitizeFilename(parts.slice(5).join("/")),
		};
	} catch {
		return null;
	}
}

/**
 * A key classified by its root. `root` names the storage class; durable keys
 * live under `assets/`, everything else under `t/`.
 */
export type ParsedStorageKey =
	({ root: "ephemeral" } & ParsedEphemeralKey) | ParsedAssetKey;

/**
 * Parses a storage key from either root and tags it with that root.
 *
 * `parseEphemeralKey` stays `t/`-only for its existing callers; this is the
 * entry point that also recognises durable `assets/` keys. Returns `null` for
 * a key outside both roots or with a malformed shape.
 */
export function parseStorageKey(key: string): ParsedStorageKey | null {
	const clean = (key || "").replace(/^\/+|\/+$/g, "");

	const asset = parseAssetKey(clean);
	if (asset) {
		return asset;
	}

	const ephemeral = parseEphemeralKey(clean);
	if (!ephemeral) {
		return null;
	}

	return { root: "ephemeral", ...ephemeral };
}

/**
 * The parts of a key scoped to one user. `category` is the ephemeral category
 * for `t/` keys and the asset kind for durable `assets/` keys.
 */
export type ParsedUserStorageKey =
	| {
			userId: string;
			category: string;
			filename: string;
	  }
	| {
			root: "asset";
			userId: string;
			category: string;
			kind: string;
			assetId: string;
			filename: string;
	  };

/**
 * Parses a user storage key into its constituent parts.
 * Handles both `t/users/{userId}/{category}/{filename}` and
 * `assets/users/{userId}/{kind}/{assetId}/{filename}`.
 *
 * A `t/` key keeps its historical three-field result; a durable key also
 * reports `root`, `kind` and `assetId`, with `category` carrying the kind.
 */
export function parseUserStorageKey(key: string): ParsedUserStorageKey | null {
	const parsed = parseStorageKey(key);
	if (!parsed) {
		return null;
	}

	if (parsed.root === "asset") {
		return {
			root: "asset",
			userId: parsed.userId,
			category: parsed.kind,
			kind: parsed.kind,
			assetId: parsed.assetId,
			filename: parsed.filename,
		};
	}

	if (parsed.type !== "user") {
		return null;
	}

	return {
		userId: parsed.userId,
		category: parsed.category,
		filename: parsed.filename,
	};
}
