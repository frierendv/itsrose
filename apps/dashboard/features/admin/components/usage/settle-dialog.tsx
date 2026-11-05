"use client";

import {
	Button,
	Description,
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
	Switch,
	Typography,
} from "@heroui/react";
import { useState } from "react";
import type { MonthOption } from "../../models";

export interface SettleDialogProps {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	months: readonly MonthOption[];
	defaultPeriod: string;
	isPending: boolean;
	onSettle: (input: {
		period: string;
		create_invoices: boolean;
	}) => Promise<void> | void;
}

/**
 * Runs one settlement for a closed period.
 *
 * Dry run is the default; issuing real provider invoices is an explicit opt-in
 * because it creates payable documents.
 */
export const SettleDialog: React.FC<SettleDialogProps> = ({
	isOpen,
	onOpenChange,
	months,
	defaultPeriod,
	isPending,
	onSettle,
}) => {
	const [period, setPeriod] = useState(defaultPeriod);
	const [createInvoices, setCreateInvoices] = useState(false);

	return (
		<ModalBackdrop isOpen={isOpen} onOpenChange={onOpenChange}>
			<ModalContainer size="md">
				<ModalDialog>
					<ModalCloseTrigger />
					<ModalHeader>
						<ModalHeading>Run settlement</ModalHeading>
					</ModalHeader>
					<ModalBody className="flex flex-col gap-4">
						<Typography type="body-sm" color="muted">
							Settlement reads the durable rollups for the period,
							resolves the rate effective at the period start and
							freezes the result. Re-running the same period never
							duplicates rows or invoices.
						</Typography>

						<Select
							aria-label="Settlement period"
							selectionMode="single"
							value={period}
							onChange={(key) => setPeriod(String(key))}
						>
							<Label>Settlement period (UTC)</Label>
							<Select.Trigger>
								<Select.Value />
								<Select.Indicator />
							</Select.Trigger>
							<Select.Popover>
								<ListBox items={months}>
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

						<div className="flex items-center rounded-medium border border-separator p-3">
							<Switch
								className="w-full"
								isSelected={createInvoices}
								onChange={setCreateInvoices}
							>
								<Switch.Content className="w-full justify-between">
									<div className="flex flex-col gap-0.5">
										<Label>Issue invoices</Label>
										<Description>
											Creates real payable invoices
											through the payment provider. Leave
											off to inspect the computed amounts
											first.
										</Description>
									</div>
									<Switch.Control>
										<Switch.Thumb />
									</Switch.Control>
								</Switch.Content>
							</Switch>
						</div>
					</ModalBody>
					<ModalFooter className="flex justify-end gap-2 pt-4">
						<Button
							type="button"
							variant="secondary"
							onPress={() => onOpenChange(false)}
						>
							Cancel
						</Button>
						<Button
							isPending={isPending}
							type="button"
							variant={createInvoices ? "danger" : "primary"}
							onPress={async () => {
								await onSettle({
									period,
									create_invoices: createInvoices,
								});
							}}
						>
							{createInvoices
								? "Settle and issue invoices"
								: "Run dry settlement"}
						</Button>
					</ModalFooter>
				</ModalDialog>
			</ModalContainer>
		</ModalBackdrop>
	);
};

SettleDialog.displayName = "SettleDialog";
