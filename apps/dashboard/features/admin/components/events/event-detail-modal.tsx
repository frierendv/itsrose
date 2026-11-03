"use client";

import { CopyButton } from "@/components/copy-button";
import { JsonView } from "@/components/json-view";
import {
	Button,
	Chip,
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
import type { TransactionInvoiceEvent } from "@itsrose/auth/itsrose";
import {
	extractEventIdentifiers,
	formatDateTime,
	getEventStatusProps,
} from "../../utils";

export interface EventDetailModalProps {
	event: TransactionInvoiceEvent | null;
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
}

export const EventDetailModal: React.FC<EventDetailModalProps> = ({
	event,
	isOpen,
	onOpenChange,
}) => {
	if (!event) {
		return null;
	}

	const statusProps = getEventStatusProps(event.event_name);
	const { orderId, invoiceId } = extractEventIdentifiers(event.event_json);

	return (
		<ModalBackdrop isOpen={isOpen} onOpenChange={onOpenChange}>
			<ModalContainer size="lg">
				<ModalDialog>
					<ModalCloseTrigger />
					<ModalHeader>
						<div className="flex items-center gap-2">
							<ModalHeading>Event Details</ModalHeading>
							<Chip
								color={statusProps.color}
								size="sm"
								variant="soft"
							>
								{event.event_name}
							</Chip>
						</div>
					</ModalHeader>

					<ModalBody className="flex flex-col gap-4">
						{/* Meta summary block */}
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-surface-secondary text-xs">
							<div>
								<span className="text-muted">Event ID:</span>
								<p className="font-mono font-medium text-foreground select-all">
									{event.id || "—"}
								</p>
							</div>
							<div>
								<span className="text-muted">Event Name:</span>
								<p className="font-mono font-medium text-foreground select-all">
									{event.event_name}
								</p>
							</div>
							<div>
								<span className="text-muted">Order ID:</span>
								<p className="font-mono font-medium text-foreground select-all">
									{orderId || "—"}
								</p>
							</div>
							<div>
								<span className="text-muted">Invoice ID:</span>
								<p className="font-mono font-medium text-foreground select-all">
									{invoiceId || "—"}
								</p>
							</div>
							<div className="sm:col-span-2">
								<span className="text-muted">
									Recorded Timestamp:
								</span>
								<p className="text-foreground">
									{formatDateTime(
										event.created_at ||
											(
												event as unknown as {
													createdAt?: string | Date;
												}
											).createdAt
									)}
								</p>
							</div>
						</div>

						{/* Formatted JSON Payload Viewer */}
						<div className="flex flex-col gap-2">
							<div className="flex items-center justify-between">
								<Typography type="body-xs" color="muted">
									Formatted Payload Viewer
								</Typography>
								<CopyButton
									textValue={JSON.stringify(event.event_json)}
								/>
							</div>
							<div className="overflow-x-auto max-h-96">
								<JsonView
									value={event.event_json}
									displayDataTypes={false}
								/>
							</div>
						</div>
					</ModalBody>

					<ModalFooter className="flex justify-end gap-2 pt-3">
						<Button
							variant="secondary"
							onPress={() => onOpenChange(false)}
						>
							Close
						</Button>
					</ModalFooter>
				</ModalDialog>
			</ModalContainer>
		</ModalBackdrop>
	);
};

EventDetailModal.displayName = "EventDetailModal";
