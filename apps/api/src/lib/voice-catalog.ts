import type {
	IElevenLabsListVoices,
	IElevenLabsListVoicesResponse,
} from "@itsrose/elevenlabs";

/**
 * One voice as the upstream catalogue returns it.
 */
export type Voice = IElevenLabsListVoicesResponse["voices"][number];

/**
 * Fetches one page of the upstream voice catalogue.
 *
 * Injected so the catalogue, and the ownership port built on it, can be
 * unit-tested without a network call; the application passes `getVoices` from
 * `@itsrose/elevenlabs`.
 */
export type FetchVoices = (
	options?: IElevenLabsListVoices
) => Promise<IElevenLabsListVoicesResponse>;

/**
 * How long the fully-paginated catalogue stays cached.
 */
export const VOICE_CATALOG_TTL_MS = 5 * 60 * 1000;

/**
 * How many voices one upstream page may contain.
 *
 * The upstream schema caps `page_size` at 100, so this is the largest page the
 * catalogue can ask for.
 */
export const VOICE_CATALOG_PAGE_SIZE = 100;

/**
 * How many pages the catalogue reads before it gives up.
 *
 * Ten pages of {@linkcode VOICE_CATALOG_PAGE_SIZE} voices is the same bound as
 * {@linkcode VOICE_CATALOG_MAX_VOICES}; the loop is bounded twice so neither a
 * lying `has_more` nor an unexpectedly large page can make it run away.
 */
export const VOICE_CATALOG_MAX_PAGES = 10;

/**
 * How many voices the catalogue reads before it gives up.
 */
export const VOICE_CATALOG_MAX_VOICES = 1000;

/**
 * Sink for the catalogue's warnings.
 *
 * Fastify's `request.log`/`fastify.log` satisfies it; tests can pass a
 * recorder.
 */
export interface VoiceCatalogLogger {
	warn?: (message: string, ...args: unknown[]) => void;
}

/**
 * Inputs for {@linkcode createVoiceCatalog}.
 */
export interface CreateVoiceCatalogOptions {
	/** Reads one page of the upstream catalogue. */
	fetchVoices: FetchVoices;
	/** Where a capped catalogue is reported; omitted, the warning is silent. */
	logger?: VoiceCatalogLogger;
}

/**
 * The upstream voice catalogue, fully paginated and cached.
 */
export interface VoiceCatalog {
	/**
	 * The merged catalogue, every page read.
	 *
	 * Cached for {@linkcode VOICE_CATALOG_TTL_MS}; concurrent callers share one
	 * in-flight fetch, and a failed fetch is not cached.
	 */
	load(): Promise<Voice[]>;

	/**
	 * Drops the cached catalogue so the next {@linkcode VoiceCatalog.load}
	 * re-reads the upstream.
	 */
	invalidate(): void;
}

/**
 * Builds the fully-paginated, cached upstream voice catalogue.
 *
 * `GET /v2/voices` pages by default: a caller's clones are routinely not on
 * the first page. Filtering after one page would return an incomplete library,
 * and the page metadata would describe voices the caller cannot see. The
 * catalogue therefore reads every page (bounded — see
 * {@linkcode VOICE_CATALOG_MAX_PAGES} / {@linkcode VOICE_CATALOG_MAX_VOICES}),
 * merges by `voice_id` with later pages winning, and caches the merged list.
 *
 * The cache sits behind one in-flight promise, so a burst of requests reads
 * the upstream once. {@linkcode VoiceCatalog.invalidate} is what makes a
 * freshly created clone visible immediately instead of waiting for the TTL;
 * it also increments a generation, so a fetch that started before the
 * invalidation cannot repopulate the cache with the stale list.
 *
 * @param options - The upstream reader and the warning sink.
 * @returns The cached catalogue.
 */
export function createVoiceCatalog({
	fetchVoices,
	logger,
}: CreateVoiceCatalogOptions): VoiceCatalog {
	let cached: { voices: Voice[]; expiresAt: number } | null = null;
	let inFlight: Promise<Voice[]> | null = null;
	let generation = 0;

	const fetchAllPages = async (): Promise<Voice[]> => {
		const merged = new Map<string, Voice>();
		let pages = 0;
		let hasMore = true;
		let nextPageToken: string | undefined;

		while (
			hasMore &&
			pages < VOICE_CATALOG_MAX_PAGES &&
			merged.size < VOICE_CATALOG_MAX_VOICES
		) {
			const response = await fetchVoices({
				page_size: VOICE_CATALOG_PAGE_SIZE,
				next_page_token: nextPageToken,
			});

			// The upstream id is unique per account, so a later page replaces
			// the earlier copy of the same voice (a renamed or re-categorised
			// voice is the fresh one).
			for (const voice of response.voices) {
				merged.set(voice.voice_id, voice);
			}

			pages += 1;
			hasMore = response.has_more === true;
			nextPageToken = response.next_page_token ?? undefined;

			if (hasMore && !nextPageToken) {
				// The upstream promised another page without a token to reach
				// it. Treat the catalogue as exhausted rather than loop.
				hasMore = false;
			}
		}

		if (hasMore) {
			logger?.warn?.(
				`[voice-catalog] The upstream voice catalogue was capped at ${pages} page(s) / ${merged.size} voice(s); the library is incomplete.`,
				{ pages, voices: merged.size }
			);
		}

		return [...merged.values()];
	};

	const load = async (): Promise<Voice[]> => {
		const now = Date.now();
		if (cached && cached.expiresAt > now) {
			return cached.voices;
		}

		if (!inFlight) {
			const requestGeneration = generation;
			inFlight = fetchAllPages()
				.then((voices) => {
					// An invalidation that landed while this fetch was in
					// flight marks the result stale; the next load refetches.
					if (requestGeneration === generation) {
						cached = {
							voices,
							expiresAt: Date.now() + VOICE_CATALOG_TTL_MS,
						};
					}
					return voices;
				})
				.finally(() => {
					inFlight = null;
				});
		}

		return inFlight;
	};

	const invalidate = (): void => {
		cached = null;
		generation += 1;
	};

	return { load, invalidate };
}
