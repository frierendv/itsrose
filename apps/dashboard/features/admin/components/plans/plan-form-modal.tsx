"use client";

import {
	Button,
	Description,
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
	Switch,
	TextArea,
	TextField,
	Typography,
} from "@heroui/react";
import type { ApiPlan } from "@itsrose/auth-billing";
import { useState } from "react";
import { useCreatePlanMutation, useUpdatePlanMutation } from "../../hooks";

export interface PlanFormModalProps {
	plan?: ApiPlan | null;
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
}

interface PlanFormContentProps {
	plan?: ApiPlan | null;
	onOpenChange: (open: boolean) => void;
}

const PlanFormContent: React.FC<PlanFormContentProps> = ({
	plan,
	onOpenChange,
}) => {
	const isEdit = Boolean(plan);
	const createMutation = useCreatePlanMutation();
	const updateMutation = useUpdatePlanMutation();

	const [planId, setPlanId] = useState(plan?.plan_id ?? "");
	const [name, setName] = useState(plan?.name ?? "");
	const [description, setDescription] = useState(plan?.description ?? "");
	// Kept as a string so clearing the field does not snap back to "0".
	const [amount, setAmount] = useState<string>(
		plan?.price?.amount === undefined ? "60000" : String(plan.price.amount)
	);
	const [interval] = useState<"month" | "year">(
		plan?.price?.interval ?? "month"
	);
	// Blank means "unlimited"; the API accepts `null` for that case.
	const [quotaRequests, setQuotaRequests] = useState<string>(
		plan?.quota_requests === null || plan?.quota_requests === undefined
			? ""
			: String(plan.quota_requests)
	);
	const [featuresText, setFeaturesText] = useState(
		plan?.features
			? plan.features.join("\n")
			: "All standard models\nCommunity support\nAPI key generation"
	);
	const [highlighted, setHighlighted] = useState(Boolean(plan?.highlighted));

	const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
		e.preventDefault();
		if (!planId.trim() || !name.trim()) {
			return;
		}

		const features = featuresText
			.split("\n")
			.map((s) => s.trim())
			.filter(Boolean);
		const quotaRequestsValue =
			quotaRequests.trim().length === 0
				? null
				: Math.max(0, Math.trunc(Number(quotaRequests)));

		try {
			if (isEdit) {
				await updateMutation.mutateAsync({
					plan_id: planId,
					name,
					description,
					price_amount: Math.max(0, Math.trunc(Number(amount))),
					interval,
					quota_requests: quotaRequestsValue,
					features,
					highlighted,
				});
			} else {
				await createMutation.mutateAsync({
					plan_id: planId,
					name,
					description,
					price_amount: Math.max(0, Math.trunc(Number(amount))),
					interval,
					quota_requests: quotaRequestsValue,
					features,
					highlighted,
				});
			}
			onOpenChange(false);
		} catch {
			// Handled by hook
		}
	};

	const isPending = createMutation.isPending || updateMutation.isPending;

	return (
		<Form onSubmit={handleSubmit}>
			<ModalBody className="flex flex-col gap-4">
				<Typography type="body-sm" color="muted">
					Configure tier specifications, pricing in IDR, and the
					monthly request allowance.
				</Typography>

				<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<TextField
						isDisabled={isEdit}
						isRequired
						name="plan_id"
						onChange={setPlanId}
						value={planId}
					>
						<Label>Plan Identifier (Slug)</Label>
						<Input
							variant="secondary"
							placeholder="e.g. enterprise"
						/>
					</TextField>

					<TextField
						isRequired
						name="name"
						onChange={setName}
						value={name}
					>
						<Label>Display Name</Label>
						<Input
							variant="secondary"
							placeholder="e.g. Enterprise Tier"
						/>
					</TextField>
				</div>

				<TextField
					name="description"
					onChange={setDescription}
					value={description}
				>
					<Label>Description</Label>
					<Input
						variant="secondary"
						placeholder="e.g. High-throughput dedicated platform quota"
					/>
				</TextField>

				<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
					<TextField
						isRequired
						name="price_amount"
						onChange={setAmount}
						type="number"
						value={amount}
					>
						<Label>Monthly Price (IDR)</Label>
						<Input
							variant="secondary"
							min={0}
							step={1000}
							placeholder="160000"
						/>
					</TextField>

					<TextField
						defaultValue={interval}
						isDisabled
						name="interval"
					>
						<Label>Billing Interval</Label>
						<Input variant="secondary" />
					</TextField>

					<TextField
						name="quota_requests"
						onChange={setQuotaRequests}
						type="number"
						value={quotaRequests}
					>
						<Label>Monthly Request Quota</Label>
						<Input
							variant="secondary"
							min={0}
							placeholder="Blank = unlimited"
						/>
						<Description>Leave blank for unlimited</Description>
					</TextField>
				</div>

				<TextField
					name="features"
					onChange={setFeaturesText}
					value={featuresText}
				>
					<Label>Features List (One feature per line)</Label>
					<TextArea
						variant="secondary"
						rows={4}
						placeholder="120 Requests per minute&#10;Unlimited generation history&#10;Priority customer support"
					/>
				</TextField>

				<div className="flex items-center rounded-medium border border-separator p-3">
					<Switch
						className="w-full"
						isSelected={highlighted}
						name="highlighted"
						onChange={setHighlighted}
					>
						<Switch.Content className="w-full justify-between">
							<div className="flex flex-col gap-0.5">
								<Label>Highlight on Pricing Table</Label>
								<Description>
									Show prominent &ldquo;Popular&rdquo; badge
									on workspace upgrade screens
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
					variant="secondary"
					onPress={() => onOpenChange(false)}
					type="button"
				>
					Cancel
				</Button>
				<Button variant="primary" type="submit" isPending={isPending}>
					{isEdit ? "Save Changes" : "Create Plan"}
				</Button>
			</ModalFooter>
		</Form>
	);
};

export const PlanFormModal: React.FC<PlanFormModalProps> = ({
	plan,
	isOpen,
	onOpenChange,
}) => {
	const isEdit = Boolean(plan);
	const contentKey = plan?.plan_id || (isOpen ? "open-new" : "closed");

	return (
		<ModalBackdrop isOpen={isOpen} onOpenChange={onOpenChange}>
			<ModalContainer size="lg">
				<ModalDialog>
					<ModalCloseTrigger />
					<ModalHeader>
						<ModalHeading>
							{isEdit
								? `Edit Plan: ${plan?.name}`
								: "Create Billing Plan"}
						</ModalHeading>
					</ModalHeader>

					{isOpen && (
						<PlanFormContent
							key={contentKey}
							plan={plan}
							onOpenChange={onOpenChange}
						/>
					)}
				</ModalDialog>
			</ModalContainer>
		</ModalBackdrop>
	);
};

PlanFormModal.displayName = "PlanFormModal";
