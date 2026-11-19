"use client";

import { TableEmptyState, TableLoadingState } from "@/components/table";
import { ArrowRightFromSquare, TrashBin } from "@gravity-ui/icons";
import { Button, Chip, Table, Typography } from "@heroui/react";
import type { Asset } from "../types";
import { formatAssetDate, formatAssetKind, formatBytes } from "../utils";

export interface AssetTableProps {
	assets: Asset[];
	isPending: boolean;
	/** True while a signed URL is being minted for the open action. */
	isOpening: boolean;
	onOpen: (asset: Asset) => void;
	onDelete: (asset: Asset) => void;
}

/**
 * The library table: one row per durable asset.
 *
 * Nothing is fetched here — the page owns the query so pagination and the
 * empty/error states stay in one place.
 */
export const AssetTable: React.FC<AssetTableProps> = ({
	assets,
	isPending,
	isOpening,
	onOpen,
	onDelete,
}) => (
	<Table>
		<Table.ScrollContainer>
			<Table.Content aria-label="Asset library">
				<Table.Header>
					<Table.Column isRowHeader>Filename</Table.Column>
					<Table.Column>Kind</Table.Column>
					<Table.Column>Size</Table.Column>
					<Table.Column>Created</Table.Column>
					<Table.Column>
						<span className="sr-only">Actions</span>
					</Table.Column>
				</Table.Header>
				<Table.Body
					renderEmptyState={() =>
						isPending ? (
							<TableLoadingState />
						) : (
							<TableEmptyState label="No assets yet. Upload one to get started." />
						)
					}
				>
					{assets.map((asset) => (
						<Table.Row id={asset.asset_id} key={asset.asset_id}>
							<Table.Cell>
								<Typography
									type="body-sm"
									className="max-w-72 truncate font-medium"
								>
									{asset.filename}
								</Typography>
							</Table.Cell>
							<Table.Cell>
								<Chip size="sm" variant="soft">
									{formatAssetKind(asset.kind)}
								</Chip>
							</Table.Cell>
							<Table.Cell>
								<Typography
									type="body-sm"
									className="tabular-nums"
								>
									{formatBytes(asset.size_bytes)}
								</Typography>
							</Table.Cell>
							<Table.Cell>
								<time dateTime={asset.created_at}>
									<Typography type="body-sm">
										{formatAssetDate(asset.created_at)}
									</Typography>
								</time>
							</Table.Cell>
							<Table.Cell>
								<div className="flex items-center justify-end gap-2">
									<Button
										aria-label={`Open ${asset.filename}`}
										isDisabled={isOpening}
										size="sm"
										variant="ghost"
										onPress={() => onOpen(asset)}
									>
										<ArrowRightFromSquare
											aria-hidden
											className="size-3.5"
										/>
										<span>Open</span>
									</Button>
									<Button
										aria-label={`Delete ${asset.filename}`}
										size="sm"
										variant="danger-soft"
										onPress={() => onDelete(asset)}
									>
										<TrashBin
											aria-hidden
											className="size-3.5"
										/>
										<span>Delete</span>
									</Button>
								</div>
							</Table.Cell>
						</Table.Row>
					))}
				</Table.Body>
			</Table.Content>
		</Table.ScrollContainer>
	</Table>
);

AssetTable.displayName = "AssetTable";
