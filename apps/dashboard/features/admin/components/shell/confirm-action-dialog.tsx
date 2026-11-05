"use client";

import { AlertDialog, Button, Typography } from "@heroui/react";

export type ConfirmActionDialogProps = {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	/** Consequence copy; keep it factual about what happens on confirm. */
	description: React.ReactNode;
	confirmLabel: string;
	cancelLabel?: string;
	tone?: "primary" | "danger";
	isPending?: boolean;
	onConfirm: () => void | Promise<void>;
};

/**
 * Confirmation dialog for mutating admin actions.
 */
export const ConfirmActionDialog: React.FC<ConfirmActionDialogProps> = ({
	isOpen,
	onOpenChange,
	title,
	description,
	confirmLabel,
	cancelLabel = "Cancel",
	tone = "danger",
	isPending = false,
	onConfirm,
}) => (
	<AlertDialog isOpen={isOpen} onOpenChange={onOpenChange}>
		<AlertDialog.Backdrop isDismissable={!isPending}>
			<AlertDialog.Container>
				<AlertDialog.Dialog>
					<AlertDialog.CloseTrigger />
					<AlertDialog.Header>
						<AlertDialog.Icon />
						<AlertDialog.Heading>{title}</AlertDialog.Heading>
					</AlertDialog.Header>
					<AlertDialog.Body>
						<Typography type="body-sm">{description}</Typography>
					</AlertDialog.Body>
					<AlertDialog.Footer className="flex justify-end gap-2">
						<Button
							isDisabled={isPending}
							variant="outline"
							onPress={() => onOpenChange(false)}
						>
							{cancelLabel}
						</Button>
						<Button
							isPending={isPending}
							variant={tone === "danger" ? "danger" : "primary"}
							onPress={onConfirm}
						>
							{confirmLabel}
						</Button>
					</AlertDialog.Footer>
				</AlertDialog.Dialog>
			</AlertDialog.Container>
		</AlertDialog.Backdrop>
	</AlertDialog>
);

ConfirmActionDialog.displayName = "ConfirmActionDialog";
