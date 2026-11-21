"use client";

import { assetQueryKeys } from "@/features/assets/query-keys";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createVoice, deleteVoice, listVoices } from "../api";
import { voiceQueryKeys } from "../query-keys";
import type {
	CreateVoiceInput,
	CreateVoiceResponse,
	DeleteVoice,
} from "../types";

/**
 * Fetches the caller's clones plus the premade catalogue.
 *
 * The library only changes through this feature's own mutations, so it stays
 * fresh for half a minute.
 */
export function useVoices() {
	const query = useQuery({
		queryKey: voiceQueryKeys.list(),
		staleTime: 30_000,
		queryFn: () => listVoices(),
	});

	return {
		...query,
		voices: query.data?.items ?? [],
	};
}

/**
 * Clones a voice from a sample asset.
 *
 * Voices are invalidated because the library gains a row; assets are
 * invalidated too because the sample may have just been uploaded through
 * `createVoiceFromFile`, which changes the asset library as well.
 */
export function useCreateVoiceMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (input: CreateVoiceInput): Promise<CreateVoiceResponse> =>
			createVoice(input),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: voiceQueryKeys.all });
			queryClient.invalidateQueries({ queryKey: assetQueryKeys.all });
		},
	});
}

/** Deletes one owned clone and invalidates the voice library. */
export function useDeleteVoiceMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (voiceId: string): Promise<DeleteVoice> =>
			deleteVoice(voiceId),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: voiceQueryKeys.all });
		},
	});
}
