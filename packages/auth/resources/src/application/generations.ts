import type {
	Generation,
	GenerationFeature,
	GenerationRegistryPort,
} from "../types";

/* -------------------------------------------------------------------------- */
/*                                  Constants                                 */
/* -------------------------------------------------------------------------- */

/**
 * Lifetime of the generated storage class, in milliseconds.
 *
 * The generated object lives under the ephemeral `t/` root, whose bucket
 * lifecycle rule is one day (`@itsrose/auth-storage` policy). The deadline is
 * stored beside the row so a reader can derive "expired" without sweeping
 * anything: `expires_at` only says when the object stops being readable, and
 * a saved result keeps answering through `result_asset_id`.
 */
const GENERATED_RESULT_LIFETIME_MS = 86_400_000;

/** The status of a generation whose result was delivered. */
const SUCCEEDED_STATUS = "succeeded";

/* -------------------------------------------------------------------------- */
/*                                Domain errors                               */
/* -------------------------------------------------------------------------- */

/**
 * Thrown when a generation is missing, soft-deleted, or not owned by the
 * caller.
 *
 * The three cases deliberately share one error: a foreign owner must not be
 * able to tell an existing generation from a nonexistent one.
 */
export class GenerationNotFoundError extends Error {
	/** Application id the caller asked for. */
	readonly generationId: string;

	constructor(generationId: string) {
		super(`Generation "${generationId}" was not found.`);
		this.name = "GenerationNotFoundError";
		this.generationId = generationId;
	}
}

/* -------------------------------------------------------------------------- */
/*                                Service shape                               */
/* -------------------------------------------------------------------------- */

export type RecordGenerationInput = {
	/** The caller; the only ownership field any read checks. */
	userId: string;
	/** Recorded beside `user_id` for tenant-wide accounting. */
	tenantId: string;
	/** Closed union; adding a feature is a schema-adjacent change. */
	feature: GenerationFeature;
	/** Upstream provider, `elevenlabs` first. */
	provider: string;
	/** The upstream task id, for asynchronous providers only. */
	providerTaskId?: string;
	/** The prompt/text the user submitted. Never audio bytes. */
	inputText?: string;
	/** Sanitised JSON text of the other request parameters. */
	inputParams?: string;
	/**
	 * Ephemeral object key under `t/users/{userId}/generated/`, when a result
	 * was stored. Its presence is what sets `expires_at`.
	 */
	resultKey?: string;
	resultContentType?: string;
};

export type ListGenerationsInput = {
	userId: string;
	/** Restrict the list to one feature; all features when omitted. */
	feature?: GenerationFeature;
	/** Maximum number of rows to return. */
	limit: number;
	/** Number of live rows to skip. */
	offset: number;
};

export type FindGenerationInput = {
	userId: string;
	generationId: string;
};

export type MarkGenerationSavedInput = FindGenerationInput & {
	/** Durable `asset_registry.asset_id` the result was saved as. */
	assetId: string;
};

export type RemoveGenerationInput = FindGenerationInput;

/** The ports and injected non-determinism the service depends on. */
export type GenerationServiceDependencies = {
	registry: GenerationRegistryPort;
	/** Injected so `created_at`/`expires_at` stay deterministic in tests. */
	clock: () => Date;
	/** Injected so the row gets a server-chosen application id. */
	newId: () => string;
};

export interface GenerationService {
	/** Records one delivered generation; never stores its bytes. */
	record(input: RecordGenerationInput): Promise<Generation>;
	/** The caller's live generations, newest first. */
	list(input: ListGenerationsInput): Promise<Generation[]>;
	/** Reads one owned, live generation or throws not-found. */
	find(input: FindGenerationInput): Promise<Generation>;
	/** Links the generation to the durable asset the result was saved as. */
	markSaved(input: MarkGenerationSavedInput): Promise<Generation>;
	/**
	 * Soft-deletes the row and returns it.
	 *
	 * The returned row is what lets the caller remove an unsaved ephemeral
	 * object: clearing history never touches the durable asset a saved result
	 * points at.
	 */
	remove(input: RemoveGenerationInput): Promise<Generation>;
	/** Account-deletion purge: hard-deletes the caller's rows. */
	deleteAllForUser(userId: string): Promise<number>;
}

/* -------------------------------------------------------------------------- */
/*                                  Helpers                                   */
/* -------------------------------------------------------------------------- */

/**
 * Reads one live generation row the caller owns.
 *
 * The adapter already filters tombstones on the list path, but `findById`
 * returns them on purpose so a caller can tell "deleted" from "never existed".
 * The ownership, live and identity checks therefore live here, where they also
 * hold for any port implementation.
 */
async function findOwnedGeneration(
	registry: GenerationRegistryPort,
	userId: string,
	generationId: string
): Promise<Generation> {
	const record = await registry.findById(generationId);

	if (!record || record.user_id !== userId || record.deleted_at !== null) {
		throw new GenerationNotFoundError(generationId);
	}

	return record;
}

/* -------------------------------------------------------------------------- */
/*                                  Service                                   */
/* -------------------------------------------------------------------------- */

/**
 * Builds the generation ledger application service.
 *
 * The service owns the record/list/find/save/clear rules; persistence, time
 * and ids all arrive as ports or injected functions, so this module has no
 * database driver, transport or SDK dependency.
 */
export function createGenerationService({
	registry,
	clock,
	newId,
}: GenerationServiceDependencies): GenerationService {
	return {
		async record(input: RecordGenerationInput): Promise<Generation> {
			const createdAt = clock();
			const hasStoredResult = input.resultKey !== undefined;

			return registry.insert({
				generation_id: newId(),
				tenant_id: input.tenantId,
				user_id: input.userId,
				feature: input.feature,
				provider: input.provider,
				provider_task_id: input.providerTaskId ?? null,
				status: SUCCEEDED_STATUS,
				input_text: input.inputText ?? null,
				input_params: input.inputParams ?? null,
				result_key: input.resultKey ?? null,
				result_content_type: input.resultContentType ?? null,
				result_asset_id: null,
				// The object the key points at keeps the generated class's
				// one-day life. Without a stored result there is no deadline to
				// derive, so the column stays null instead of carrying a date
				// that would read as "still valid".
				expires_at: hasStoredResult
					? new Date(
							createdAt.getTime() + GENERATED_RESULT_LIFETIME_MS
						)
					: null,
				created_at: createdAt,
				deleted_at: null,
			});
		},

		async list({
			userId,
			feature,
			limit,
			offset,
		}: ListGenerationsInput): Promise<Generation[]> {
			return registry.listForUser(userId, {
				feature,
				limit,
				offset,
			});
		},

		async find({
			userId,
			generationId,
		}: FindGenerationInput): Promise<Generation> {
			return findOwnedGeneration(registry, userId, generationId);
		},

		async markSaved({
			userId,
			generationId,
			assetId,
		}: MarkGenerationSavedInput): Promise<Generation> {
			const record = await findOwnedGeneration(
				registry,
				userId,
				generationId
			);

			const updated = await registry.markSaved(
				record.generation_id,
				assetId
			);

			// The row was live when it was read; a concurrent clear turning
			// the update into a no-op must not surface as a saved generation.
			if (!updated) {
				throw new GenerationNotFoundError(generationId);
			}

			return updated;
		},

		async remove({
			userId,
			generationId,
		}: RemoveGenerationInput): Promise<Generation> {
			const record = await findOwnedGeneration(
				registry,
				userId,
				generationId
			);
			const at = clock();

			const deleted = await registry.softDelete(record.generation_id, at);

			if (!deleted) {
				throw new GenerationNotFoundError(generationId);
			}

			return { ...record, deleted_at: at };
		},

		async deleteAllForUser(userId: string): Promise<number> {
			return registry.deleteAllForUser(userId);
		},
	};
}
