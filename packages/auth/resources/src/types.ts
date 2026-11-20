/**
 * The kinds of upstream provider resource the resources package records.
 *
 * Closed on purpose: a new kind (an avatar, a fine-tune) is added here and in
 * the schema before anything writes it, so a read never has to guess what an
 * unknown string means.
 */
export type ProviderResourceKind = "voice";

/**
 * One user-owned upstream provider resource as stored in
 * `provider_resources`.
 *
 * Columns are `snake_case` because this is the database shape. The row — not
 * the upstream id — is what grants ownership: the upstream object lives in the
 * shared platform account, where every caller of the platform key can list and
 * use it.
 */
export type ProviderResource = {
	/** Application identity of the resource, unique per row. */
	resource_id: string;
	/** Upstream provider, `elevenlabs` first. */
	provider: string;
	/** The upstream id: `voice_id` for kind `voice`. */
	provider_resource_id: string;
	tenant_id: string;
	/** The owner. The only field enforcement reads. */
	user_id: string;
	/** Closed enum; `voice` is the first and only member in v1. */
	kind: ProviderResourceKind;
	/** The user-chosen display name as given to the provider. */
	name: string;
	/** The durable asset the clone was made from, when one was recorded. */
	sample_asset_id: string | null;
	/** `active` while the upstream object exists. */
	status: string;
	created_at: Date | string;
	/** Soft delete marker; `null` while the resource is live. */
	deleted_at: Date | string | null;
};

/**
 * Optional filters for {@link ProviderResourceRegistryPort.listForUser}.
 */
export type ProviderResourceListOptions = {
	/** Restrict the list to one kind; all kinds when omitted. */
	kind?: ProviderResourceKind;
};

/**
 * Persistence port for the provider resource ledger.
 *
 * Declared here so the application layer never imports the Postgres adapter;
 * the adapter maps snake_case columns onto {@link ProviderResource}.
 */
export type ProviderResourceRegistryPort = {
	/** Inserts one row and returns the stored record. */
	insert: (record: ProviderResource) => Promise<ProviderResource>;
	/**
	 * Reads one row by application identity.
	 *
	 * A soft-deleted row is still returned, with its `deleted_at`, so a caller
	 * can tell "deleted" from "never existed".
	 */
	findById: (resourceId: string) => Promise<ProviderResource | null>;
	/**
	 * Reads the live row for one upstream id.
	 *
	 * Soft-deleted rows are excluded: once the upstream object is gone the row
	 * is a tombstone and must not answer an ownership check. The composite
	 * unique index on `(provider, provider_resource_id)` makes this a single
	 * row.
	 */
	findByProviderResourceId: (
		provider: string,
		providerResourceId: string
	) => Promise<ProviderResource | null>;
	/** The user's live resources, newest first; soft-deleted rows excluded. */
	listForUser: (
		userId: string,
		options?: ProviderResourceListOptions
	) => Promise<ProviderResource[]>;
	/**
	 * Marks the row deleted without removing it.
	 *
	 * Returns `false` when the row was already deleted, which makes a retried
	 * delete a no-op.
	 */
	softDelete: (resourceId: string, at: Date) => Promise<boolean>;
};

/* -------------------------------------------------------------------------- */
/*                                 Generations                                */
/* -------------------------------------------------------------------------- */

/**
 * The studio features a generation row can record.
 *
 * Closed on purpose, and owned by this package: a new feature is a
 * schema-adjacent change — extend this union, the schema comment beside the
 * `feature` column, the writer and the reader in the same change — so a read
 * never has to guess what an unknown string means.
 */
export const GENERATION_FEATURES = [
	"text_to_speech",
	"text_to_speech_with_timestamps",
	"speech_to_speech",
	"text_to_dialogue",
	"music_compose",
] as const;

/** One member of the closed generation feature union. */
export type GenerationFeature = (typeof GENERATION_FEATURES)[number];

/**
 * Narrows a string to a known {@link GenerationFeature}.
 *
 * Accepts a plain string because rows and request payloads carry one; an
 * unknown feature is a data error, not something to coerce to a default.
 */
export function isGenerationFeature(value: string): value is GenerationFeature {
	return (GENERATION_FEATURES as readonly string[]).includes(value);
}

/**
 * One studio generation as stored in `generations`.
 *
 * Columns are `snake_case` because this is the database shape. The row records
 * what was generated, with which inputs and when; it never holds the produced
 * bytes. `result_key` names the ephemeral object while it lives, and
 * `result_asset_id` is set only once the user saved the result to the library.
 */
export type Generation = {
	/** Application identity, chosen before the upstream call. */
	generation_id: string;
	/** Recorded beside `user_id` for tenant-wide accounting. */
	tenant_id: string;
	/** The caller. The only ownership field any read checks. */
	user_id: string;
	/** Closed union; adding a feature is a schema-adjacent change. */
	feature: GenerationFeature;
	/** Upstream provider, `elevenlabs` first. */
	provider: string;
	/** The upstream task id, for asynchronous providers only. */
	provider_task_id: string | null;
	/** Execution status only; `expired` is derived, never stored. */
	status: string;
	/** The prompt/text the user submitted. Never audio bytes. */
	input_text: string | null;
	/** Sanitised JSON text of the other request parameters. */
	input_params: string | null;
	/** Ephemeral object key, when a result was stored. */
	result_key: string | null;
	result_content_type: string | null;
	/** Durable asset id, set only when the result was saved. */
	result_asset_id: string | null;
	/** The generated object's lifecycle deadline; null without a result. */
	expires_at: Date | string | null;
	created_at: Date | string;
	/** Soft delete marker; `null` while the row is live. */
	deleted_at: Date | string | null;
};

/**
 * Page window and optional filter for
 * {@link GenerationRegistryPort.listForUser}.
 */
export type GenerationListOptions = {
	/** Restrict the list to one feature; all features when omitted. */
	feature?: GenerationFeature;
	/** Maximum number of rows to return. */
	limit: number;
	/** Number of live rows to skip. */
	offset: number;
};

/**
 * Persistence port for the generation ledger.
 *
 * Declared here so the application layer never imports the Postgres adapter;
 * the adapter maps snake_case columns onto {@link Generation}.
 */
export type GenerationRegistryPort = {
	/** Inserts one row and returns the stored record. */
	insert: (record: Generation) => Promise<Generation>;
	/**
	 * Reads one row by application identity.
	 *
	 * A soft-deleted row is still returned, with its `deleted_at`, so a caller
	 * can tell "deleted" from "never existed".
	 */
	findById: (generationId: string) => Promise<Generation | null>;
	/** The user's live rows, newest first; tombstones excluded. */
	listForUser: (
		userId: string,
		options: GenerationListOptions
	) => Promise<Generation[]>;
	/**
	 * Links a live row to the durable asset it was saved as.
	 *
	 * Returns the updated row, or `null` when no live row matched, which lets
	 * the service turn a concurrent delete into its one not-found error.
	 */
	markSaved: (
		generationId: string,
		assetId: string
	) => Promise<Generation | null>;
	/**
	 * Marks the row deleted without removing it.
	 *
	 * Returns `false` when the row was already deleted, which makes a retried
	 * clear a no-op.
	 */
	softDelete: (generationId: string, at: Date) => Promise<boolean>;
	/**
	 * Hard-deletes every row of one user, tombstones included.
	 *
	 * This is the account-purge path: history is not a durable record that has
	 * to outlive the account. Returns the number of rows removed.
	 */
	deleteAllForUser: (userId: string) => Promise<number>;
};
