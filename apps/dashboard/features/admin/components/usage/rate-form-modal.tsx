"use client";

import {
	Button,
	Input,
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
	TextArea,
	Typography,
} from "@heroui/react";
import type { UsageUnitRate } from "@itsrose/auth-usage";
import { useState } from "react";
import { useSetRateMutation } from "../../hooks";
import { formatIDR } from "../../utils";

export interface RateFormModalProps {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	/** Plan tiers available for pricing. */
	tiers: readonly string[];
	/** Current open versions keyed by tier, used for consequence copy. */
	openRates: readonly UsageUnitRate[];
}

export const RateFormModal: React.FC<RateFormModalProps> = ({
	isOpen,
	onOpenChange,
	tiers,
	openRates,
}) => {
	const [tier, setTier] = useState(tiers[0] ?? "free");
	const [amount, setAmount] = useState("");
	const [note, setNote] = useState("");
	const mutation = useSetRateMutation();

	const currentAmount = openRates.find(
		(rate) => rate.plan_tier === tier
	)?.amount;
	const parsedAmount = Number(amount);
	const isValid =
		amount.trim().length > 0 &&
		Number.isFinite(parsedAmount) &&
		parsedAmount >= 0;

	const reset = () => {
		setAmount("");
		setNote("");
	};

	return (
		<ModalBackdrop
			isOpen={isOpen}
			onOpenChange={(open) => {
				if (!open) {
					reset();
				}
				onOpenChange(open);
			}}
		>
			<ModalContainer size="md">
				<ModalDialog>
					<ModalCloseTrigger />
					<ModalHeader>
						<ModalHeading>New rate version</ModalHeading>
					</ModalHeader>
					<ModalBody className="flex flex-col gap-4">
						<Typography type="body-sm" color="muted">
							Publishing a rate closes the current version for the
							tier and writes an audit entry. Settled periods keep
							the version they were invoiced with.
						</Typography>

						<Select
							aria-label="Plan tier"
							selectionMode="single"
							value={tier}
							onChange={(key) => setTier(String(key))}
						>
							<Label>Plan tier</Label>
							<Select.Trigger>
								<Select.Value />
								<Select.Indicator />
							</Select.Trigger>
							<Select.Popover>
								<ListBox
									items={tiers.map((item) => ({
										id: item,
										label: item,
									}))}
								>
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

						<div className="flex flex-col gap-1.5">
							<label className="text-xs font-medium text-muted">
								Price per request (IDR)
							</label>
							<Input
								min={0}
								placeholder="e.g. 150"
								type="number"
								value={amount}
								variant="secondary"
								onChange={(e) => setAmount(e.target.value)}
							/>
							<Typography type="body-xs" color="muted">
								{currentAmount === undefined
									? "No open rate for this tier yet."
									: `Current open rate: ${formatIDR(currentAmount)} per request.`}
							</Typography>
						</div>

						<div className="flex flex-col gap-1.5">
							<label className="text-xs font-medium text-muted">
								Audit note (optional)
							</label>
							<TextArea
								maxLength={500}
								placeholder="Why is this rate changing?"
								rows={2}
								value={note}
								variant="secondary"
								onChange={(e) => setNote(e.target.value)}
							/>
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
							isDisabled={!isValid}
							isPending={mutation.isPending}
							type="button"
							onPress={async () => {
								if (!isValid) {
									return;
								}
								try {
									await mutation.mutateAsync({
										plan_tier: tier,
										amount: Math.trunc(parsedAmount),
										note:
											note.trim().length > 0
												? note.trim()
												: undefined,
									});
									onOpenChange(false);
									reset();
								} catch {
									// Handled by the hook.
								}
							}}
						>
							Publish version
						</Button>
					</ModalFooter>
				</ModalDialog>
			</ModalContainer>
		</ModalBackdrop>
	);
};

RateFormModal.displayName = "RateFormModal";
