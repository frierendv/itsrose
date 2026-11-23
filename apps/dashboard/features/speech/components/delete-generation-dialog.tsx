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
import type { GenerationItem } from "../types";
import { generationExcerpt } from "../utils";

export interface DeleteGenerationDialogProps {
	/** The generation awaiting confirmation; `null` keeps the dialog closed. */
	generation: GenerationItem | null;
	isPending: boolean;
	onOpenChange: (isOpen: boolean) => void;
	onConfirm: () => void;
}

/**
 * Confirms the deletion of one history row.
 *
 * Deleting a generation is not the same as deleting an asset: a saved
 * generation keeps the promoted copy in the asset library, and the copy says
 * so before the owner commits.
 */
export const DeleteGenerationDialog: React.FC<DeleteGenerationDialogProps> = ({
	generation,
	isPending,
	onOpenChange,
	onConfirm,
}) => {
	const excerpt = generationExcerpt(generation?.input_text ?? null);

	return (
		<ModalBackdrop isOpen={generation !== null} onOpenChange={onOpenChange}>
			<ModalContainer size="sm">
				<ModalDialog>
					<ModalCloseTrigger />
					<ModalHeader>
						<ModalHeading>Delete generation</ModalHeading>
					</ModalHeader>

					<ModalBody className="flex flex-col gap-3">
						<Typography type="body-sm">
							<strong>{excerpt}</strong> will be removed from your
							generation history.
						</Typography>
						<Typography type="body-xs" color="muted">
							If you saved it, the saved audio stays in your asset
							library and is not affected. The history row itself
							cannot be restored.
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
							Delete generation
						</Button>
					</ModalFooter>
				</ModalDialog>
			</ModalContainer>
		</ModalBackdrop>
	);
};

DeleteGenerationDialog.displayName = "DeleteGenerationDialog";
