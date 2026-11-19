"use client";

import { getErrorMessage } from "@/lib/errors";
import { CloudArrowUpIn } from "@gravity-ui/icons";
import {
	Alert,
	Button,
	Label,
	ListBox,
	ModalBackdrop,
	ModalBody,
	ModalCloseTrigger,
	ModalContainer,
	ModalDialog,
	ModalFooter,
	ModalHeader,
	ModalHeading,
	Select,
	toast,
	Typography,
} from "@heroui/react";
import { useState } from "react";
import { ASSET_KIND_OPTIONS, DEFAULT_ASSET_KIND } from "../constants";
import { useUploadAssetMutation } from "../hooks";
import { assetKindSchema, type AssetKind } from "../types";
import { formatBytes } from "../utils";

export interface UploadAssetDialogProps {
	isOpen: boolean;
	onOpenChange: (isOpen: boolean) => void;
	/** Called after a successful upload, e.g. to jump back to the first page. */
	onUploaded?: () => void;
}

/**
 * Uploads one file through the multipart `POST /assets` endpoint.
 *
 * The dialog owns its form state so a cancelled upload never leaves a stale
 * file selected; the mutation is disabled while in flight.
 */
export const UploadAssetDialog: React.FC<UploadAssetDialogProps> = ({
	isOpen,
	onOpenChange,
	onUploaded,
}) => {
	const [kind, setKind] = useState<AssetKind>(DEFAULT_ASSET_KIND);
	const [file, setFile] = useState<File | null>(null);
	const [error, setError] = useState<string | null>(null);

	const uploadMutation = useUploadAssetMutation();
	const isUploading = uploadMutation.isPending;

	const handleOpenChange = (open: boolean) => {
		if (!open) {
			setFile(null);
			setError(null);
			uploadMutation.reset();
		}
		onOpenChange(open);
	};

	const handleKindChange = (key: string) => {
		const parsed = assetKindSchema.safeParse(key);
		if (parsed.success) {
			setKind(parsed.data);
		}
	};

	const handleUpload = async () => {
		if (!file) {
			setError("Choose a file to upload first.");
			return;
		}

		setError(null);

		try {
			const asset = await uploadMutation.mutateAsync({ kind, file });
			toast.success(`${asset.filename} was added to the asset library.`);
			handleOpenChange(false);
			onUploaded?.();
		} catch (err) {
			// The envelope message is the server's wording; fall back when the
			// response never reached the asset routes.
			setError(getErrorMessage(err, "The asset could not be uploaded."));
		}
	};

	return (
		<ModalBackdrop isOpen={isOpen} onOpenChange={handleOpenChange}>
			<ModalContainer size="md">
				<ModalDialog>
					<ModalCloseTrigger />
					<ModalHeader>
						<ModalHeading>Upload asset</ModalHeading>
					</ModalHeader>

					<ModalBody className="flex flex-col gap-4">
						<Typography type="body-sm" color="muted">
							Files uploaded here are durable: they stay in your
							library until you delete them, and they count
							towards your plan&apos;s storage entitlement.
						</Typography>

						<Select
							aria-label="Asset kind"
							isDisabled={isUploading}
							selectionMode="single"
							value={kind}
							onChange={(key) => handleKindChange(String(key))}
						>
							<Label>Kind</Label>
							<Select.Trigger>
								<Select.Value />
								<Select.Indicator />
							</Select.Trigger>
							<Select.Popover>
								<ListBox items={ASSET_KIND_OPTIONS}>
									{(item) => (
										<ListBox.Item
											id={item.id}
											textValue={item.label}
										>
											{item.label}
											<ListBox.ItemIndicator />
										</ListBox.Item>
									)}
								</ListBox>
							</Select.Popover>
						</Select>

						<div className="flex flex-col gap-2">
							<label
								className="text-sm font-medium"
								htmlFor="asset-file"
							>
								File
							</label>
							<input
								aria-label="Asset file"
								className="block w-full cursor-pointer text-sm file:mr-3 file:cursor-pointer file:rounded-medium file:border-0 file:bg-surface-secondary file:px-3 file:py-1.5 file:text-sm file:font-medium"
								disabled={isUploading}
								id="asset-file"
								type="file"
								onChange={(event) => {
									setFile(event.target.files?.[0] ?? null);
									setError(null);
								}}
							/>
							<Typography type="body-xs" color="muted">
								{file
									? `${file.name} · ${formatBytes(file.size)}`
									: "Pick any file. The API checks its type from the file content."}
							</Typography>
						</div>

						{error ? (
							<Alert status="danger" className="w-full">
								<Alert.Indicator />
								<Alert.Content>
									<Alert.Description>
										{error}
									</Alert.Description>
								</Alert.Content>
							</Alert>
						) : null}
					</ModalBody>

					<ModalFooter>
						<Button
							isDisabled={isUploading}
							slot="close"
							variant="tertiary"
						>
							Cancel
						</Button>
						<Button
							isDisabled={!file || isUploading}
							isPending={isUploading}
							variant="primary"
							onPress={handleUpload}
						>
							<CloudArrowUpIn aria-hidden className="size-4" />
							<span>Upload</span>
						</Button>
					</ModalFooter>
				</ModalDialog>
			</ModalContainer>
		</ModalBackdrop>
	);
};

UploadAssetDialog.displayName = "UploadAssetDialog";
