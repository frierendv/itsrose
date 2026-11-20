import type {
	ProviderResource,
	ProviderResourceKind,
	ProviderResourceRegistryPort,
} from "../types";

/* -------------------------------------------------------------------------- */
/*                                    Ports                                   */
/* -------------------------------------------------------------------------- */

/**
 * Upstream operations the voice service needs.
 *
 * Implemented by the host application over the feature client, so this package
 * never imports an upstream SDK. `deleteVoice` must reject on failure; the
 * service keeps the row live so the delete stays retryable.
 */
export interface VoiceProviderPort {
	/** Removes one upstream voice; resolving means it is gone. */
	deleteVoice(voiceId: string): Promise<void>;
}

/* -------------------------------------------------------------------------- */
/*                                Domain errors                               */
/* -------------------------------------------------------------------------- */

/**
 * Thrown when an upstream voice is already recorded for another owner.
 *
 * The error names the upstream object, never the owner: the caller that lost
 * the race must not learn who holds the voice, only that it is taken.
 */
export class VoiceConflictError extends Error {
	/** Provider the upstream id belongs to. */
	readonly provider: string;
	/** Upstream id that is already recorded. */
	readonly providerResourceId: string;

	constructor(provider: string, providerResourceId: string) {
		super(
			`Voice "${providerResourceId}" from "${provider}" is already recorded.`
		);
		this.name = "VoiceConflictError";
		this.provider = provider;
		this.providerResourceId = providerResourceId;
	}
}

/**
 * Thrown when a voice is missing, soft-deleted, or not owned by the caller.
 *
 * The three cases deliberately share one error: a foreign owner must not be
 * able to tell an existing voice from a nonexistent one.
 */
export class VoiceNotFoundError extends Error {
	/** Upstream id the caller asked for. */
	readonly providerResourceId: string;

	constructor(providerResourceId: string) {
		super(`Voice "${providerResourceId}" was not found.`);
		this.name = "VoiceNotFoundError";
		this.providerResourceId = providerResourceId;
	}
}

/* -------------------------------------------------------------------------- */
/*                                Service shape                               */
/* -------------------------------------------------------------------------- */

export type RecordVoiceInput = {
	/** The caller; the only ownership field any read checks. */
	userId: string;
	/** Recorded beside `user_id` for tenant-wide accounting. */
	tenantId: string;
	/** Upstream provider, `elevenlabs` first. */
	provider: string;
	/** The provider's id for the voice. */
	providerResourceId: string;
	/** The user-chosen display name as given to the provider. */
	name: string;
	/** The durable asset the clone was made from, when one was recorded. */
	sampleAssetId?: string;
};

export type ListVoicesInput = {
	userId: string;
	/** Restrict the list to one kind; `voice` when the caller asks for it. */
	kind?: ProviderResourceKind;
};

export type RemoveVoiceInput = {
	userId: string;
	providerResourceId: string;
};

export type RemoveAllVoicesForUserInput = {
	userId: string;
};

/** One upstream delete that failed during an account-wide purge. */
export type VoiceRemovalFailure = {
	provider_resource_id: string;
	error: unknown;
};

/** Outcome of an account-wide purge; individual failures do not throw. */
export type VoiceRemovalSummary = {
	/** Rows whose upstream voice and row delete both succeeded. */
	deleted: number;
	/** Failures kept for the operator to retry; the row stays live. */
	failed: VoiceRemovalFailure[];
};

/** The ports and injected non-determinism the service depends on. */
export type VoiceServiceDependencies = {
	registry: ProviderResourceRegistryPort;
	provider: VoiceProviderPort;
	/** Injected so `created_at`/`deleted_at` stay deterministic in tests. */
	clock: () => Date;
	/** Injected so the ledger row gets a server-chosen application id. */
	newId: () => string;
};

export interface VoiceService {
	/** Records a new upstream voice, or returns the caller's existing row. */
	record(input: RecordVoiceInput): Promise<ProviderResource>;
	/** The caller's live voices, newest first. */
	list(input: ListVoicesInput): Promise<ProviderResource[]>;
	/** Deletes upstream first, then tombstones the row. */
	remove(input: RemoveVoiceInput): Promise<void>;
	/** Account-deletion purge: every live voice, failures collected. */
	removeAllForUser(
		input: RemoveAllVoicesForUserInput
	): Promise<VoiceRemovalSummary>;
}

/* -------------------------------------------------------------------------- */
/*                                  Helpers                                   */
/* -------------------------------------------------------------------------- */

/** The only kind this service records. */
const VOICE_KIND: ProviderResourceKind = "voice";

/** The status of a row whose upstream object is live. */
const ACTIVE_STATUS = "active";

/**
 * Reads one live voice row the caller owns.
 *
 * The caller names the upstream id because that is what the provider delete
 * needs, and the port's composite lookup also needs a provider this signature
 * deliberately does not assume. The ownership lookup is therefore the caller's
 * live library: a missing, soft-deleted and foreign voice all collapse into
 * one not-found result, because the query is scoped by the caller's `user_id`
 * and excludes tombstones.
 */
async function findOwnedVoice(
	registry: ProviderResourceRegistryPort,
	userId: string,
	providerResourceId: string
): Promise<ProviderResource> {
	const records = await registry.listForUser(userId, { kind: VOICE_KIND });
	const record = records.find(
		(row) => row.provider_resource_id === providerResourceId
	);

	// The owner and tombstone checks are redundant against a conforming
	// adapter, but they keep the no-existence-leak rule true for any port
	// implementation.
	if (!record || record.user_id !== userId || record.deleted_at !== null) {
		throw new VoiceNotFoundError(providerResourceId);
	}

	return record;
}

/* -------------------------------------------------------------------------- */
/*                                  Service                                   */
/* -------------------------------------------------------------------------- */

/**
 * Builds the voice ledger application service.
 *
 * The service owns the ownership rules; persistence, upstream deletion, time
 * and ids all arrive as ports or injected functions, so this module has no
 * SDK, database or transport dependency.
 */
export function createVoiceService({
	registry,
	provider,
	clock,
	newId,
}: VoiceServiceDependencies): VoiceService {
	return {
		async record(input: RecordVoiceInput): Promise<ProviderResource> {
			const existing = await registry.findByProviderResourceId(
				input.provider,
				input.providerResourceId
			);

			if (existing) {
				// Re-recording the same upstream object is idempotent for its
				// owner and a conflict for anyone else.
				if (existing.user_id === input.userId) {
					return existing;
				}
				throw new VoiceConflictError(
					input.provider,
					input.providerResourceId
				);
			}

			return registry.insert({
				resource_id: newId(),
				provider: input.provider,
				provider_resource_id: input.providerResourceId,
				tenant_id: input.tenantId,
				user_id: input.userId,
				kind: VOICE_KIND,
				name: input.name,
				sample_asset_id: input.sampleAssetId ?? null,
				status: ACTIVE_STATUS,
				created_at: clock(),
				deleted_at: null,
			});
		},

		async list({ userId, kind }: ListVoicesInput) {
			return registry.listForUser(userId, { kind });
		},

		async remove({
			userId,
			providerResourceId,
		}: RemoveVoiceInput): Promise<void> {
			const record = await findOwnedVoice(
				registry,
				userId,
				providerResourceId
			);

			// Upstream first: a failed provider call leaves the row live, so the
			// caller can retry and the row remains the retry manifest. Writing
			// the tombstone first would strand an upstream voice with nothing
			// left to retry.
			await provider.deleteVoice(record.provider_resource_id);
			await registry.softDelete(record.resource_id, clock());
		},

		async removeAllForUser({
			userId,
		}: RemoveAllVoicesForUserInput): Promise<VoiceRemovalSummary> {
			const records = await registry.listForUser(userId, {
				kind: VOICE_KIND,
			});

			const result: VoiceRemovalSummary = { deleted: 0, failed: [] };

			for (const record of records) {
				try {
					await provider.deleteVoice(record.provider_resource_id);
					await registry.softDelete(record.resource_id, clock());
					result.deleted += 1;
				} catch (error) {
					// The account is already gone when this runs; a failed
					// upstream delete must be visible to an operator as a kept
					// row, not thrown into a deleted session.
					result.failed.push({
						provider_resource_id: record.provider_resource_id,
						error,
					});
				}
			}

			return result;
		},
	};
}
