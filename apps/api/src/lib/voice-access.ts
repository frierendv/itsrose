import {
	VoiceAccessDeniedError,
	VoiceAccessUnavailableError,
	type VoiceAccessPort,
} from "@itsrose/api-routes/audio";
import type { VoiceService } from "@itsrose/auth-resources/voices";
import { tenantIdForUser } from "@itsrose/auth-usage/server";
import type { IElevenLabsListVoices } from "@itsrose/elevenlabs";
import type { FastifyRequest } from "fastify";
import {
	createVoiceCatalog,
	type FetchVoices,
	type Voice,
	type VoiceCatalogLogger,
} from "./voice-catalog";

/**
 * The upstream provider every recorded voice belongs to.
 */
const VOICE_PROVIDER = "elevenlabs";

/**
 * The sort keys the list endpoint accepts.
 */
type VoiceSort = NonNullable<IElevenLabsListVoices["sort"]>;

/**
 * The direction of a sort.
 */
type VoiceSortDirection = NonNullable<IElevenLabsListVoices["sort_direction"]>;

/**
 * The slice of the voice ledger the access port needs.
 *
 * Narrowed to the three operations the port calls, so the plugin can pass the
 * service it composes and a test can pass a recording fake.
 */
export type VoiceAccessService = Pick<
	VoiceService,
	"list" | "record" | "remove"
>;

/**
 * Ports the access port is built from.
 */
export interface CreateVoiceAccessOptions {
	/** Ownership ledger: who owns which upstream voice. */
	service: VoiceAccessService;
	/** Upstream catalogue reader, used to build the caller's library. */
	fetchVoices: FetchVoices;
	/** Where the catalogue reports a capped read; omitted, it is silent. */
	logger?: VoiceCatalogLogger;
}

/**
 * The caller a request belongs to.
 *
 * The auth guard sets `request.userId` on every guarded route before a
 * handler runs. Reaching the ownership port without one is a wiring error, so
 * it fails fast instead of silently treating the request as unowned.
 *
 * @param request The request being served.
 * @returns The authenticated user id.
 * @throws {VoiceAccessUnavailableError} When no user context exists.
 */
function requireUserId(request: FastifyRequest): string {
	const userId = request.userId;
	if (!userId) {
		throw new VoiceAccessUnavailableError(
			"Voice ownership was checked before the request had an authenticated user."
		);
	}
	return userId;
}

/**
 * Whether a voice matches a free-text search.
 *
 * The upstream searches name, description, labels and category; the same
 * fields are searched here, case-insensitively, because the filtering happens
 * on our side of the catalogue. Label keys are not searched, only their
 * values: a key such as `language` would otherwise match every voice.
 *
 * @param voice The voice to test.
 * @param term The lower-cased search term.
 * @returns `true` when the voice matches.
 */
function matchesSearch(voice: Voice, term: string): boolean {
	if (voice.name.toLowerCase().includes(term)) {
		return true;
	}
	if (voice.description?.toLowerCase().includes(term)) {
		return true;
	}
	if (voice.category?.toLowerCase().includes(term)) {
		return true;
	}
	return Object.values(voice.labels).some((value) =>
		value.toLowerCase().includes(term)
	);
}

/**
 * Sorts a copy of the voices by the requested key and direction.
 *
 * The catalogue order is kept when no sort is requested, so the default list
 * is stable. A missing `created_at_unix` sorts as the oldest value, and a
 * missing direction sorts ascending.
 *
 * @param voices The voices to sort.
 * @param sort The sort key the caller asked for.
 * @param direction The direction the caller asked for.
 * @returns A sorted copy of the voices.
 */
function sortVoices(
	voices: Voice[],
	sort: VoiceSort,
	direction: VoiceSortDirection
): Voice[] {
	const sign = direction === "desc" ? -1 : 1;

	return [...voices].sort((left, right) => {
		const comparison =
			sort === "name"
				? left.name.localeCompare(right.name)
				: (left.created_at_unix ?? 0) - (right.created_at_unix ?? 0);
		return comparison * sign;
	});
}

/**
 * Builds the voice ownership port over the ledger and the upstream catalogue.
 *
 * The caller's library is built from a cached, fully-paginated catalogue
 * (`./voice-catalog`): listing after one upstream page would drop clones that
 * are not on that page, and synthesis could refuse a premade voice that is
 * beyond it. Owned voices come from the ledger (`service.list`); premade
 * voices come from the catalogue's `category === "premade"` entries.
 *
 * @param options The ledger, the catalogue reader and the warning sink.
 * @returns The port the audio routes enforce ownership through.
 */
export function createVoiceAccess({
	service,
	fetchVoices,
	logger,
}: CreateVoiceAccessOptions): VoiceAccessPort {
	const catalog = createVoiceCatalog({ fetchVoices, logger });

	const listOwnedVoiceIds = async (
		request: FastifyRequest
	): Promise<string[]> => {
		const userId = requireUserId(request);
		const voices = await service.list({ userId });
		return voices.map((voice) => voice.provider_resource_id);
	};

	return {
		listOwnedVoiceIds,

		async listVisibleVoices(request, query) {
			const [ownedIds, voices] = await Promise.all([
				listOwnedVoiceIds(request),
				catalog.load(),
			]);
			const owned = new Set(ownedIds);

			// The caller sees exactly two classes of voice: the clones it
			// owns and the platform's premade catalogue. Another user's clone
			// is neither and never reaches the response.
			let visible = voices.filter(
				(voice) =>
					owned.has(voice.voice_id) || voice.category === "premade"
			);

			const search = query.search?.trim().toLowerCase();
			if (search) {
				visible = visible.filter((voice) =>
					matchesSearch(voice, search)
				);
			}

			if (query.sort) {
				visible = sortVoices(
					visible,
					query.sort,
					query.sort_direction ?? "asc"
				);
			}

			return {
				voices: visible,
				has_more: false,
				next_page_token: null,
				total_count: visible.length,
			};
		},

		async assertCanUseVoice(request, voiceId) {
			const owned = await listOwnedVoiceIds(request);
			if (owned.includes(voiceId)) {
				return;
			}

			const voices = await catalog.load();
			const candidate = voices.find(
				(voice) => voice.voice_id === voiceId
			);
			if (candidate?.category === "premade") {
				return;
			}

			// One error for "another user's clone" and "no such voice": the
			// route must not become an existence oracle.
			throw new VoiceAccessDeniedError(voiceId);
		},

		async recordClonedVoice(request, voice) {
			const userId = requireUserId(request);

			await service.record({
				userId,
				tenantId: tenantIdForUser(userId),
				provider: VOICE_PROVIDER,
				providerResourceId: voice.voice_id,
				name: voice.name,
			});

			// The clone is now owned by this caller. Drop the cached
			// catalogue so the very next listing/synthesis sees it instead of
			// waiting for the TTL to expire.
			catalog.invalidate();
		},

		async deleteOwnedVoice(request, voiceId) {
			const userId = requireUserId(request);

			// Upstream first, then the tombstone: a failed upstream delete
			// leaves the row live as the retry manifest.
			await service.remove({ userId, providerResourceId: voiceId });
		},
	};
}
