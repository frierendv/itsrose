import type { StorageClient } from "@itsrose/s3";
import { buildUserAssetPrefix, sanitizeUserId } from "./keys";
import { deleteUserTempFiles } from "./operations";
import { ASSET_REGISTRY_TABLE } from "./schema";

/**
 * The slice of a Better Auth database adapter the durable purge needs.
 *
 * Declared structurally so the operation stays testable without Better Auth;
 * `ctx.context.adapter` satisfies it unchanged. `deleteMany` is part of the
 * installed adapter surface (`DBAdapter["deleteMany"]`, better-auth 1.7.23).
 */
export interface AssetRegistryPurgePort {
	deleteMany(input: {
		model: string;
		where: Array<{ field: string; value: string }>;
	}): Promise<number>;
}

/** Which half of the durable purge failed. */
export type DurableAssetPurgeStage = "objects" | "registry";

/**
 * Thrown when the durable purge could not complete.
 *
 * `stage` reports which half failed, so the caller can log a precise reason.
 * `remainingObjects` is non-zero only when the object purge reported errors,
 * in which case no registry row was deleted: the rows stay behind as the
 * retry manifest.
 */
export class DurableAssetPurgeError extends Error {
	/** Which half of the durable purge failed. */
	readonly stage: DurableAssetPurgeStage;

	/** The user whose durable assets were being purged. */
	readonly userId: string;

	/** Objects S3 reported as not deleted; `0` for a registry failure. */
	readonly remainingObjects: number;

	constructor(params: {
		stage: DurableAssetPurgeStage;
		userId: string;
		message: string;
		remainingObjects?: number;
		cause?: unknown;
	}) {
		super(
			params.message,
			params.cause === undefined ? undefined : { cause: params.cause }
		);
		this.name = "DurableAssetPurgeError";
		this.stage = params.stage;
		this.userId = params.userId;
		this.remainingObjects = params.remainingObjects ?? 0;
	}
}

/** What one complete durable purge removed. */
export interface DurableAssetPurgeResult {
	/** Sanitized user id whose assets were purged. */
	userId: string;
	/** Objects under `assets/users/{userId}/` that S3 reported deleted. */
	objectsDeleted: number;
	/** Registry rows removed by the one `deleteMany` call. */
	rowsDeleted: number;
}

/**
 * Purges a user's durable assets in object-first order.
 *
 * 1. Removes every object under `assets/users/{userId}/`.
 * 2. Deletes the `asset_registry` rows only when that purge reported no
 *    errors. An incomplete object purge throws with the rows untouched, so a
 *    retry still has a manifest of what the user owned.
 *
 * The durable root carries no lifecycle rule, so nothing else would ever
 * remove these objects after the account is gone.
 */
export async function purgeUserDurableAssets(params: {
	s3: StorageClient;
	adapter: AssetRegistryPurgePort;
	userId: string;
}): Promise<DurableAssetPurgeResult> {
	const userId = sanitizeUserId(params.userId);
	const prefix = buildUserAssetPrefix(userId);

	let result: Awaited<ReturnType<StorageClient["purgePrefix"]>>;

	try {
		result = await params.s3.purgePrefix(prefix);
	} catch (error) {
		throw new DurableAssetPurgeError({
			stage: "objects",
			userId,
			message: `Failed to purge durable assets for user "${userId}": the object purge under "${prefix}" did not complete.`,
			cause: error,
		});
	}

	if (result.errors.length > 0) {
		throw new DurableAssetPurgeError({
			stage: "objects",
			userId,
			remainingObjects: result.errors.length,
			message: `Failed to purge durable assets for user "${userId}": ${result.errors.length} object(s) remain under "${prefix}"; registry rows were kept so a retry still has a manifest.`,
		});
	}

	let rowsDeleted: number;

	try {
		rowsDeleted = await params.adapter.deleteMany({
			model: ASSET_REGISTRY_TABLE,
			where: [{ field: "user_id", value: userId }],
		});
	} catch (error) {
		throw new DurableAssetPurgeError({
			stage: "registry",
			userId,
			message: `Failed to delete the durable asset registry rows for user "${userId}" after purging "${prefix}".`,
			cause: error,
		});
	}

	return {
		userId,
		objectsDeleted: result.deleted.length,
		rowsDeleted,
	};
}

/**
 * Log sink for the account-deletion purge.
 *
 * Better Auth's `ctx.context.logger` satisfies it; tests can pass a recorder.
 */
export interface DurablePurgeLogger {
	warn?: (message: string, ...args: unknown[]) => void;
	error?: (message: string, ...args: unknown[]) => void;
}

/** Inputs for {@link purgeAccountStorageOnDelete}. */
export interface AccountDeletionPurgeOptions {
	s3: StorageClient;
	adapter: AssetRegistryPurgePort;
	logger?: DurablePurgeLogger;
	/**
	 * `false` skips both roots; mirrors
	 * `StoragePluginOptions.autoPurgeOnAccountDelete`.
	 */
	autoPurgeOnAccountDelete?: boolean;
}

/**
 * Runs the storage half of account deletion, as the auth hook calls it.
 *
 * The ephemeral `t/users/{userId}/` purge stays best-effort: it is started,
 * a failure is warned about, and the hook does not wait for it. The durable
 * `assets/users/{userId}/` purge is awaited because no lifecycle rule covers
 * that root; its failure is logged at error level with the user id and the
 * stage, and is not rethrown — the account is already deleted, so throwing
 * would only fail a request whose work is done.
 */
export async function purgeAccountStorageOnDelete(
	userId: string,
	options: AccountDeletionPurgeOptions
): Promise<void> {
	if (options.autoPurgeOnAccountDelete === false) {
		return;
	}

	void deleteUserTempFiles(userId, options.s3).catch((error: unknown) => {
		options.logger?.warn?.(
			`[storagePlugin] Failed to purge ephemeral storage for deleted user "${userId}"`,
			error
		);
	});

	try {
		await purgeUserDurableAssets({
			s3: options.s3,
			adapter: options.adapter,
			userId,
		});
	} catch (error) {
		const stage =
			error instanceof DurableAssetPurgeError ? error.stage : "unknown";
		options.logger?.error?.(
			`[storagePlugin] Failed to purge durable assets for deleted user "${userId}" at stage "${stage}"`,
			error
		);
	}
}
