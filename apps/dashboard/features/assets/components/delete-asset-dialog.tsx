"use client";

import {
	Button,
	ModalBackdrop,
	ModalBody,
	ModalCloseTrigger,
	ModalContainer,
	ModalDialog,
	ModalFooter,
	ModalHeader,
	ModalHeading,
	Typography,
} from "@heroui/react";
import type { Asset } from "../types";

export interface DeleteAssetDialogProps {
	/** The asset awaiting confirmation; `null` keeps the dialog closed. */
	asset: Asset | null;
	isPending: boolean;
	onOpenChange: (isOpen: boolean) => void;
	onConfirm: () => void;
}

/**
 * Confirms the irreversible half of the asset lifecycle.
 *
 * Deletion removes the stored object, not just the list row, so it always
 * goes through an explicit confirmation.
 */
export const DeleteAssetDialog: React.FC<DeleteAssetDialogProps> = ({
	asset,
	isPending,
	onOpenChange,
	onConfirm,
}) => (
	<ModalBackdrop isOpen={asset !== null} onOpenChange={onOpenChange}>
		<ModalContainer size="sm">
			<ModalDialog>
				<ModalCloseTrigger />
				<ModalHeader>
					<ModalHeading>Delete asset</ModalHeading>
				</ModalHeader>

				<ModalBody className="flex flex-col gap-3">
					<Typography type="body-sm">
						<strong>{asset?.filename}</strong> will be removed from
						the library and its stored file will be deleted. This
						cannot be undone.
					</Typography>
					<Typography type="body-xs" color="muted">
						The storage it used is released immediately, so a later
						upload can use that capacity again.
					</Typography>
				</ModalBody>

				<ModalFooter>
					<Button
						isDisabled={isPending}
						slot="close"
						variant="tertiary"
					>
						Cancel
					</Button>
					<Button
						isDisabled={isPending}
						isPending={isPending}
						variant="danger"
						onPress={onConfirm}
					>
						Delete asset
					</Button>
				</ModalFooter>
			</ModalDialog>
		</ModalContainer>
	</ModalBackdrop>
);

DeleteAssetDialog.displayName = "DeleteAssetDialog";
