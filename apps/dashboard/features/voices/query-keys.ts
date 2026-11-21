/**
 * React Query key factory for the voice library.
 *
 * Every key lives under `voiceQueryKeys.all`, so a create or a delete
 * invalidates the whole library with one prefix.
 */
export const voiceQueryKeys = {
	all: ["voices"] as const,
	lists: () => [...voiceQueryKeys.all, "list"] as const,
	list: () => [...voiceQueryKeys.lists()] as const,
	details: () => [...voiceQueryKeys.all, "detail"] as const,
	detail: (voiceId: string) =>
		[...voiceQueryKeys.details(), voiceId] as const,
};
