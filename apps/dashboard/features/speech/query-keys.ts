import type { GenerationFeature } from "./types";

/** The parameters that identify one cached generation page. */
export type SpeechGenerationListKey = {
	feature?: GenerationFeature;
	limit: number;
	offset: number;
};

/**
 * React Query key factory for the speech surface.
 *
 * Every generation key lives under `speechQueryKeys.generations.all()`, so a
 * generation, a save or a delete invalidates every paginated page and every
 * detail with one prefix. A signed URL key would be wrong here: it expires, so
 * the generation URL hook keeps it out of the cache.
 */
export const speechQueryKeys = {
	all: ["speech"] as const,
	generations: {
		all: () => [...speechQueryKeys.all, "generations"] as const,
		list: (params: SpeechGenerationListKey) =>
			[
				...speechQueryKeys.generations.all(),
				"list",
				params.feature ?? "all",
				params.limit,
				params.offset,
			] as const,
		detail: (generationId: string) =>
			[
				...speechQueryKeys.generations.all(),
				"detail",
				generationId,
			] as const,
	},
};
