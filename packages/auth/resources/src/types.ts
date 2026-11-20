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
