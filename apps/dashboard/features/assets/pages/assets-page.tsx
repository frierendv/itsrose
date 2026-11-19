"use client";

import { getErrorMessage } from "@/lib/errors";
import { CloudArrowUpIn } from "@gravity-ui/icons";
import { Alert, Button, Pagination, toast, Typography } from "@heroui/react";
import { useState } from "react";
import {
	AssetTable,
	DeleteAssetDialog,
	UploadAssetDialog,
} from "../components";
import { ASSETS_PAGE_SIZE } from "../constants";
import {
	useAssets,
	useAssetUrlMutation,
	useDeleteAssetMutation,
} from "../hooks";
import type { Asset } from "../types";

/**
 * The durable asset library: list, upload, open through a signed URL, delete.
 *
 * Pagination is offset-based because the list endpoint returns a page and no
 * total; a full page is what enables "Next".
 */
export const AssetsPage: React.FC = () => {
	const [offset, setOffset] = useState(0);
	const [isUploadOpen, setUploadOpen] = useState(false);
	const [assetToDelete, setAssetToDelete] = useState<Asset | null>(null);

	const { assets, isPending, isError, error, refetch, hasNextPage } =
		useAssets({ offset });
	const deleteMutation = useDeleteAssetMutation();
	const urlMutation = useAssetUrlMutation();

	const handleOpen = async (asset: Asset) => {
		try {
			const signed = await urlMutation.mutateAsync(asset.asset_id);
			// The signed URL is short-lived; open it immediately and let the
			// browser fetch the object directly from storage.
			window.open(signed.url, "_blank", "noopener,noreferrer");
		} catch (err) {
			toast.danger(
				getErrorMessage(err, "The asset could not be opened.")
			);
		}
	};

	const handleDelete = async () => {
		if (!assetToDelete) {
			return;
		}

		const { asset_id, filename } = assetToDelete;

		try {
			const result = await deleteMutation.mutateAsync(asset_id);
			if (!result.deleted) {
				toast.danger(`${filename} could not be deleted.`);
				return;
			}

			toast.success(`${filename} was deleted.`);
			setAssetToDelete(null);

			// Deleting the last row of a later page would leave the offset
			// past the end of the library.
			if (assets.length === 1 && offset > 0) {
				setOffset(Math.max(0, offset - ASSETS_PAGE_SIZE));
			}
		} catch (err) {
			toast.danger(
				getErrorMessage(err, "The asset could not be deleted.")
			);
		}
	};

	const hasPageFooter = assets.length > 0 || offset > 0;

	return (
		<div className="flex flex-col gap-6">
			{/* Page Header */}
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex flex-col gap-1">
					<Typography type="h2">Asset Library</Typography>
					<Typography type="body-sm" color="muted">
						Durable files attached to your account. Open one through
						a short-lived signed link, or delete it to free the
						storage it holds.
					</Typography>
				</div>
				<Button variant="primary" onPress={() => setUploadOpen(true)}>
					<CloudArrowUpIn aria-hidden className="size-4" />
					<span>Upload asset</span>
				</Button>
			</div>

			{/* Read failure */}
			{isError ? (
				<Alert status="danger" className="w-full">
					<Alert.Indicator />
					<Alert.Content>
						<Alert.Title>Could not load your assets</Alert.Title>
						<Alert.Description>
							{getErrorMessage(
								error,
								"The asset library request failed."
							)}
						</Alert.Description>
					</Alert.Content>
					<Button
						size="sm"
						variant="outline"
						onPress={() => void refetch()}
					>
						Retry
					</Button>
				</Alert>
			) : null}

			{/* Library table */}
			<AssetTable
				assets={assets}
				isOpening={urlMutation.isPending}
				isPending={isPending}
				onDelete={setAssetToDelete}
				onOpen={handleOpen}
			/>

			{/* Offset pagination: there is no total, so a full page enables Next */}
			{hasPageFooter ? (
				<Pagination size="sm">
					<Pagination.Summary>
						{assets.length > 0
							? `Showing ${offset + 1}–${offset + assets.length}`
							: "No assets on this page"}
					</Pagination.Summary>
					<Pagination.Content>
						<Pagination.Item>
							<Pagination.Previous
								isDisabled={offset === 0 || isPending}
								onPress={() =>
									setOffset(
										Math.max(0, offset - ASSETS_PAGE_SIZE)
									)
								}
							>
								<Pagination.PreviousIcon />
								Prev
							</Pagination.Previous>
						</Pagination.Item>
						<Pagination.Item>
							<Pagination.Next
								isDisabled={!hasNextPage || isPending}
								onPress={() =>
									setOffset(offset + ASSETS_PAGE_SIZE)
								}
							>
								Next
								<Pagination.NextIcon />
							</Pagination.Next>
						</Pagination.Item>
					</Pagination.Content>
				</Pagination>
			) : null}

			<UploadAssetDialog
				isOpen={isUploadOpen}
				onOpenChange={setUploadOpen}
				onUploaded={() => setOffset(0)}
			/>

			<DeleteAssetDialog
				asset={assetToDelete}
				isPending={deleteMutation.isPending}
				onConfirm={handleDelete}
				onOpenChange={(open) => {
					if (!open) {
						setAssetToDelete(null);
					}
				}}
			/>
		</div>
	);
};

AssetsPage.displayName = "AssetsPage";
