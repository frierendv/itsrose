import {
	VoiceAccessDeniedError,
	VoiceAccessUnavailableError,
	type VoiceAccessPort,
} from "@itsrose/api-routes/audio";
import type { VoiceService } from "@itsrose/auth-resources/voices";
import { tenantIdForUser } from "@itsrose/auth-usage/server";
import type {
	IElevenLabsListVoices,
	IElevenLabsListVoicesResponse,
} from "@itsrose/elevenlabs";
import type { FastifyRequest } from "fastify";

/**
 * The upstream provider every recorded voice belongs to.
 */
const VOICE_PROVIDER = "elevenlabs";

/**
 * How long the premade voice ids stay cached.
 *
 * Five minutes keeps the catalogue warm across requests without serving a
 * withdrawn premade voice for longer than a caller would plausibly notice.
 */
export const PREMADE_VOICE_CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Fetches the upstream voice catalogue.
 *
 * Injected so the port can be unit-tested without a network call; the
 * application passes `getVoices` from `@itsrose/elevenlabs`.
 */
export type FetchVoices = (
	options?: IElevenLabsListVoices
) => Promise<IElevenLabsListVoicesResponse>;

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
	/** Upstream catalogue reader, used to resolve premade voices. */
	fetchVoices: FetchVoices;
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
 * Builds the voice ownership port over the ledger and the upstream catalogue.
 *
 * Owned voices come from the ledger (`service.list`). Premade voices come from
 * the upstream catalogue, filtered to `category === "premade"` on our side as
 * well as requested from the upstream, because the filter is the provider's
 * promise and the response is ours to enforce. The premade set is cached in
 * memory for {@linkcode PREMADE_VOICE_CACHE_TTL_MS} behind one in-flight
 * promise: a burst of requests fetches the catalogue once, and a failed fetch
 * is not cached, so the next request retries.
 *
 * @param options The ledger and the catalogue reader.
 * @returns The port the audio routes enforce ownership through.
 */
export function createVoiceAccess({
	service,
	fetchVoices,
}: CreateVoiceAccessOptions): VoiceAccessPort {
	let premadeIds: { ids: Set<string>; expiresAt: number } | null = null;
	let premadeInFlight: Promise<Set<string>> | null = null;

	const loadPremadeIds = async (): Promise<Set<string>> => {
		const cached = premadeIds;
		if (cached && cached.expiresAt > Date.now()) {
			return cached.ids;
		}

		if (!premadeInFlight) {
			premadeInFlight = (async () => {
				const response = await fetchVoices({ category: "premade" });
				const ids = new Set(
					response.voices
						.filter((voice) => voice.category === "premade")
						.map((voice) => voice.voice_id)
				);
				premadeIds = {
					ids,
					expiresAt: Date.now() + PREMADE_VOICE_CACHE_TTL_MS,
				};
				return ids;
			})().finally(() => {
				premadeInFlight = null;
			});
		}

		return premadeInFlight;
	};

	const listOwnedVoiceIds = async (
		request: FastifyRequest
	): Promise<string[]> => {
		const userId = requireUserId(request);
		const voices = await service.list({ userId });
		return voices.map((voice) => voice.provider_resource_id);
	};

	return {
		listOwnedVoiceIds,

		async assertCanUseVoice(request, voiceId) {
			const owned = await listOwnedVoiceIds(request);
			if (owned.includes(voiceId)) {
				return;
			}

			const premade = await loadPremadeIds();
			if (premade.has(voiceId)) {
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
		},

		async deleteOwnedVoice(request, voiceId) {
			const userId = requireUserId(request);

			// Upstream first, then the tombstone: a failed upstream delete
			// leaves the row live as the retry manifest.
			await service.remove({ userId, providerResourceId: voiceId });
		},
	};
}
