import type { GenerationFeature } from "./types";

/** The parameters that identify one cached generation page. */
export type StudioGenerationListKey = {
	feature?: GenerationFeature;
	limit: number;
	offset: number;
};

/**
 * React Query key factory for the studio surface.
 *
 * Every generation key lives under `studioQueryKeys.generations.all()`, so a
 * generation, a save or a delete invalidates every paginated page and every
 * detail with one prefix. A signed URL key would be wrong here: it expires, so
 * the generation URL hook keeps it out of the cache.
 */
export const studioQueryKeys = {
	all: ["studio"] as const,
	generations: {
		all: () => [...studioQueryKeys.all, "generations"] as const,
		list: (params: StudioGenerationListKey) =>
			[
				...studioQueryKeys.generations.all(),
				"list",
				params.feature ?? "all",
				params.limit,
				params.offset,
			] as const,
		detail: (generationId: string) =>
			[
				...studioQueryKeys.generations.all(),
				"detail",
				generationId,
			] as const,
	},
};
