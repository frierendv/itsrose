"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	buildUploadFormData,
	deleteAsset,
	getAssetUrl,
	listAssets,
	uploadAsset,
	type UploadAssetInput,
} from "../api";
import { ASSETS_PAGE_SIZE } from "../constants";
import { assetQueryKeys } from "../query-keys";
import type { Asset, AssetDelete, AssetUrl } from "../types";

export type UseAssetsParams = {
	limit?: number;
	offset?: number;
};

/**
 * Fetches one page of the durable asset library.
 *
 * Cached under `['assets', 'list', limit, offset]`; the API has no total, so
 * `hasNextPage` is inferred from a full page rather than from a count.
 */
export function useAssets(params: UseAssetsParams = {}) {
	const limit = params.limit ?? ASSETS_PAGE_SIZE;
	const offset = params.offset ?? 0;

	const query = useQuery({
		queryKey: assetQueryKeys.list({ limit, offset }),
		// Asset rows only change through this feature's own mutations.
		staleTime: 30_000,
		queryFn: () => listAssets({ limit, offset }),
	});

	return {
		...query,
		assets: query.data?.items ?? [],
		limit,
		offset,
		hasNextPage: (query.data?.items.length ?? 0) === limit,
	};
}

/**
 * Uploads one file, then invalidates every asset list so the newest row is
 * fetched from the server rather than appended optimistically.
 */
export function useUploadAssetMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (input: UploadAssetInput): Promise<Asset> =>
			uploadAsset(buildUploadFormData(input)),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: assetQueryKeys.all });
		},
	});
}

/** Deletes one asset and invalidates every asset list. */
export function useDeleteAssetMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (assetId: string): Promise<AssetDelete> =>
			deleteAsset(assetId),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: assetQueryKeys.all });
		},
	});
}

/**
 * Mints a signed URL on demand.
 *
 * The URL expires after `expires_in` seconds, so it is fetched per open and
 * deliberately kept out of the query cache.
 */
export function useAssetUrlMutation() {
	return useMutation({
		mutationFn: (assetId: string): Promise<AssetUrl> =>
			getAssetUrl(assetId),
	});
}
