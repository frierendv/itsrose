"use client";

import { assetQueryKeys } from "@/features/assets/query-keys";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	deleteGeneration,
	generateSpeech,
	getGenerationUrl,
	listGenerations,
	saveGeneration,
} from "../api";
import { STUDIO_GENERATIONS_PAGE_SIZE } from "../constants";
import { studioQueryKeys } from "../query-keys";
import type {
	DeleteGeneration,
	GenerateSpeechInput,
	GenerateSpeechResponse,
	GenerationFeature,
	GenerationUrl,
	SaveGenerationInput,
	SaveGenerationResponse,
} from "../types";

export type UseStudioGenerationsParams = {
	feature?: GenerationFeature;
	limit?: number;
	offset?: number;
};

/**
 * Fetches one page of the generation history.
 *
 * Cached under `['studio', 'generations', 'list', feature, limit, offset]`; the
 * API has no total, so `hasNextPage` is inferred from a full page rather than
 * from a count.
 */
export function useStudioGenerations(params: UseStudioGenerationsParams = {}) {
	const feature = params.feature;
	const limit = params.limit ?? STUDIO_GENERATIONS_PAGE_SIZE;
	const offset = params.offset ?? 0;

	const query = useQuery({
		queryKey: studioQueryKeys.generations.list({ feature, limit, offset }),
		// History rows only change through this feature's own mutations.
		staleTime: 30_000,
		queryFn: () => listGenerations({ feature, limit, offset }),
	});

	return {
		...query,
		generations: query.data?.items ?? [],
		limit,
		offset,
		hasNextPage: (query.data?.items.length ?? 0) === limit,
	};
}

/**
 * Synthesises speech, then invalidates every generation page so the new row is
 * fetched from the server rather than appended optimistically.
 */
export function useGenerateSpeechMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (
			input: GenerateSpeechInput
		): Promise<GenerateSpeechResponse> => generateSpeech(input),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: studioQueryKeys.generations.all(),
			});
		},
	});
}

/** The variables of {@link useSaveGenerationMutation}. */
export type SaveGenerationMutationInput = {
	generationId: string;
} & SaveGenerationInput;

/**
 * Promotes a generated result into the asset library.
 *
 * Saving changes two surfaces: the generation row (`saved`/`asset_id`) and the
 * durable asset library the result is promoted into, so both are invalidated.
 */
export function useSaveGenerationMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			generationId,
			...input
		}: SaveGenerationMutationInput): Promise<SaveGenerationResponse> =>
			saveGeneration(generationId, input),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: studioQueryKeys.generations.all(),
			});
			queryClient.invalidateQueries({ queryKey: assetQueryKeys.all });
		},
	});
}

/** Clears one generation row and invalidates every generation page. */
export function useDeleteGenerationMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (generationId: string): Promise<DeleteGeneration> =>
			deleteGeneration(generationId),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: studioQueryKeys.generations.all(),
			});
		},
	});
}

/**
 * Mints a signed URL on demand.
 *
 * The URL expires after `expires_in` seconds, so it is fetched per open and
 * deliberately kept out of the query cache.
 */
export function useGenerationUrlMutation() {
	return useMutation({
		mutationFn: (generationId: string): Promise<GenerationUrl> =>
			getGenerationUrl(generationId),
	});
}
