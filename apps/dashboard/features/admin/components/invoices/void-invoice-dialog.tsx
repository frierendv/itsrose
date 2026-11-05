"use client";

import {
	Button,
	Form,
	Input,
	Label,
	ModalBackdrop,
	ModalBody,
	ModalCloseTrigger,
	ModalContainer,
	ModalDialog,
	ModalFooter,
	ModalHeader,
	ModalHeading,
	TextField,
	Typography,
} from "@heroui/react";
import type { Invoice } from "@itsrose/auth-billing";
import { useState } from "react";
import { useVoidInvoiceMutation } from "../../hooks";

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

	const handleVoid = async (e: React.SyntheticEvent<HTMLFormElement>) => {
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

					<Form onSubmit={handleVoid}>
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

							<TextField
								className="pt-2"
								name="reason"
								onChange={setReason}
								value={reason}
							>
								<Label>Void Reason (Optional)</Label>
								<Input
									variant="secondary"
									placeholder="e.g. Duplicate order, user requested cancellation"
								/>
							</TextField>
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
					</Form>
				</ModalDialog>
			</ModalContainer>
		</ModalBackdrop>
	);
};

VoidInvoiceDialog.displayName = "VoidInvoiceDialog";
