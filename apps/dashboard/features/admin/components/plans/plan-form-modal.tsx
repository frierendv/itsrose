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
	Switch,
	TextArea,
	Typography,
} from "@heroui/react";
import type { ApiPlan } from "@itsrose/auth/itsrose";
import { useState } from "react";
import { useCreatePlanMutation, useUpdatePlanMutation } from "../../api";

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
	const [amount, setAmount] = useState<number>(plan?.price?.amount ?? 60000);
	const [interval] = useState<"month" | "year">(
		plan?.price?.interval ?? "month"
	);
	const [rateLimitMax, setRateLimitMax] = useState<number>(
		plan?.limits?.max ?? 60
	);
	const [featuresText, setFeaturesText] = useState(
		plan?.features
			? plan.features.join("\n")
			: "All standard models\nCommunity support\nAPI key generation"
	);
	const [highlighted, setHighlighted] = useState(Boolean(plan?.highlighted));

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!planId.trim() || !name.trim()) {
			return;
		}

		const features = featuresText
			.split("\n")
			.map((s) => s.trim())
			.filter(Boolean);

		try {
			if (isEdit) {
				await updateMutation.mutateAsync({
					plan_id: planId,
					name,
					description,
					price_amount: amount,
					interval,
					rate_limit_max: rateLimitMax,
					features,
					highlighted,
				});
			} else {
				await createMutation.mutateAsync({
					plan_id: planId,
					name,
					description,
					price_amount: amount,
					interval,
					rate_limit_max: rateLimitMax,
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
		<form onSubmit={handleSubmit}>
			<ModalBody className="flex flex-col gap-4">
				<Typography type="body-sm" color="muted">
					Configure tier specifications, pricing in IDR, and
					associated rate limits.
				</Typography>

				<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div className="flex flex-col gap-1.5">
						<label className="text-xs font-medium text-muted">
							Plan Identifier (Slug)
						</label>
						<Input
							variant="secondary"
							placeholder="e.g. enterprise"
							value={planId}
							onChange={(e) => setPlanId(e.target.value)}
							disabled={isEdit}
							required
						/>
					</div>

					<div className="flex flex-col gap-1.5">
						<label className="text-xs font-medium text-muted">
							Display Name
						</label>
						<Input
							variant="secondary"
							placeholder="e.g. Enterprise Tier"
							value={name}
							onChange={(e) => setName(e.target.value)}
							required
						/>
					</div>
				</div>

				<div className="flex flex-col gap-1.5">
					<label className="text-xs font-medium text-muted">
						Description
					</label>
					<Input
						variant="secondary"
						placeholder="e.g. High-throughput dedicated platform quota"
						value={description}
						onChange={(e) => setDescription(e.target.value)}
					/>
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
					<div className="flex flex-col gap-1.5">
						<label className="text-xs font-medium text-muted">
							Monthly Price (IDR)
						</label>
						<Input
							variant="secondary"
							type="number"
							min={0}
							step={1000}
							placeholder="160000"
							value={String(amount)}
							onChange={(e) => setAmount(Number(e.target.value))}
							required
						/>
					</div>

					<div className="flex flex-col gap-1.5">
						<label className="text-xs font-medium text-muted">
							Billing Interval
						</label>
						<Input variant="secondary" value={interval} disabled />
					</div>

					<div className="flex flex-col gap-1.5">
						<label className="text-xs font-medium text-muted">
							Rate Limit (RPM)
						</label>
						<Input
							variant="secondary"
							type="number"
							min={1}
							placeholder="120"
							value={String(rateLimitMax)}
							onChange={(e) =>
								setRateLimitMax(Number(e.target.value))
							}
						/>
					</div>
				</div>

				<div className="flex flex-col gap-1.5">
					<label className="text-xs font-medium text-muted">
						Features List (One feature per line)
					</label>
					<TextArea
						variant="secondary"
						rows={4}
						placeholder="120 Requests per minute&#10;Unlimited generation history&#10;Priority customer support"
						value={featuresText}
						onChange={(e) => setFeaturesText(e.target.value)}
					/>
				</div>

				<div className="flex items-center justify-between p-3 border border-separator">
					<div className="flex flex-col">
						<Typography type="body-sm" className="font-medium">
							Highlight on Pricing Table
						</Typography>
						<Typography type="body-xs" color="muted">
							Show prominent &ldquo;Popular&rdquo; badge on
							workspace upgrade screens
						</Typography>
					</div>
					<Switch
						isSelected={highlighted}
						onChange={setHighlighted}
					/>
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
		</form>
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
