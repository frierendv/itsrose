"use client";

import {
	Button,
	Input,
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
import type { Invoice } from "@itsrose/auth/itsrose";
import { useState } from "react";
import { useVoidInvoiceMutation } from "../../api";

export interface VoidInvoiceDialogProps {
	invoice: Invoice | null;
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
}

export const VoidInvoiceDialog: React.FC<VoidInvoiceDialogProps> = ({
	invoice,
	isOpen,
	onOpenChange,
}) => {
	const [reason, setReason] = useState("");
	const voidMutation = useVoidInvoiceMutation();

	if (!invoice) {
		return null;
	}

	const handleVoid = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			await voidMutation.mutateAsync({
				invoice_id: invoice.invoice_id,
				reason: reason.trim() || "Voided by admin operation",
			});
			setReason("");
			onOpenChange(false);
		} catch {
			// Handled by hook
		}
	};

	return (
		<ModalBackdrop isOpen={isOpen} onOpenChange={onOpenChange}>
			<ModalContainer size="sm">
				<ModalDialog>
					<ModalCloseTrigger />
					<ModalHeader>
						<ModalHeading>Void Pending Invoice</ModalHeading>
					</ModalHeader>

					<form onSubmit={handleVoid}>
						<ModalBody className="flex flex-col gap-3">
							<Typography type="body-sm">
								Are you sure you want to void invoice{" "}
								<strong>{invoice.order_id}</strong> (
								<code>{invoice.invoice_id}</code>)?
							</Typography>
							<Typography type="body-xs" color="muted">
								This will mark the invoice as voided in the
								database, cancel the payment order on the
								Midtrans gateway, and record an audit event.
							</Typography>

							<div className="flex flex-col gap-1.5 pt-2">
								<label className="text-xs font-medium text-muted">
									Void Reason (Optional)
								</label>
								<Input
									variant="secondary"
									placeholder="e.g. Duplicate order, user requested cancellation"
									value={reason}
									onChange={(e) => setReason(e.target.value)}
								/>
							</div>
						</ModalBody>

						<ModalFooter className="flex justify-end gap-2 pt-3">
							<Button
								variant="secondary"
								onPress={() => onOpenChange(false)}
								type="button"
							>
								Cancel
							</Button>
							<Button
								variant="danger"
								type="submit"
								isPending={voidMutation.isPending}
							>
								Void Invoice
							</Button>
						</ModalFooter>
					</form>
				</ModalDialog>
			</ModalContainer>
		</ModalBackdrop>
	);
};

VoidInvoiceDialog.displayName = "VoidInvoiceDialog";
