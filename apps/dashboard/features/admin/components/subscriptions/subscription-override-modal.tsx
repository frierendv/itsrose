"use client";

import {
	Button,
	Description,
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
	Typography,
} from "@heroui/react";
import type { Subscription, SubscriptionStatus } from "@itsrose/auth-billing";
import { useState } from "react";
import { useAdminPlans, useUpdateSubscriptionMutation } from "../../hooks";

export interface SubscriptionOverrideModalProps {
	subscription: Subscription | null;
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
}

interface SubscriptionOverrideFormProps {
	subscription: Subscription;
	onOpenChange: (open: boolean) => void;
}

const SubscriptionOverrideForm: React.FC<SubscriptionOverrideFormProps> = ({
	subscription,
	onOpenChange,
}) => {
	const { plans } = useAdminPlans();
	const updateMutation = useUpdateSubscriptionMutation();

	const initialDateStr = subscription.period_end
		? (new Date(subscription.period_end).toISOString().split("T")[0] ?? "")
		: "";

	const [planId, setPlanId] = useState(subscription.plan_id || "hobby");
	const [status, setStatus] = useState<SubscriptionStatus>(
		subscription.status || "active"
	);
	const [periodEnd, setPeriodEnd] = useState(initialDateStr);
	const [scheduledTier, setScheduledTier] = useState(
		subscription.scheduled_tier || ""
	);
	const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState(
		Boolean(subscription.cancel_at_period_end)
	);

	const handleSave = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			let parsedEndDate: string | undefined = undefined;
			if (periodEnd) {
				parsedEndDate = new Date(
					`${periodEnd}T23:59:59.999Z`
				).toISOString();
			}

			await updateMutation.mutateAsync({
				subscription_id: subscription.id,
				userId: subscription.user_id,
				plan_id: planId,
				status,
				period_end: parsedEndDate,
				scheduled_tier: scheduledTier
					? scheduledTier.toLowerCase()
					: null,
				cancel_at_period_end: cancelAtPeriodEnd,
			});

			onOpenChange(false);
		} catch {
			// Handled by hook
		}
	};

	return (
		<form onSubmit={handleSave}>
			<ModalBody className="flex flex-col gap-4">
				<Typography type="body-sm" color="muted">
					Override active tier, extend renewal dates, or revert
					scheduled downgrades directly in the database.
				</Typography>

				<div className="flex flex-col gap-1 p-2.5 bg-surface-secondary text-xs">
					<span className="text-muted">Target User:</span>
					<span className="font-mono font-medium">
						{subscription.user_id}
					</span>
				</div>

				{/* Plan Tier Selection */}
				<div className="flex flex-col gap-1.5">
					<label className="text-xs font-medium text-muted">
						Assign Tier
					</label>
					<div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
						{plans.map((p) => {
							const isSelected =
								p.plan_id.toLowerCase() ===
								planId.toLowerCase();
							return (
								<Button
									key={p.plan_id}
									type="button"
									size="sm"
									variant={
										isSelected ? "primary" : "secondary"
									}
									onPress={() => setPlanId(p.plan_id)}
									className="capitalize"
								>
									{p.name}
								</Button>
							);
						})}
					</div>
				</div>

				{/* Status Override */}
				<div className="flex flex-col gap-1.5">
					<label className="text-xs font-medium text-muted">
						Lifecycle Status
					</label>
					<div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
						{(
							[
								"active",
								"past_due",
								"expired",
								"canceled",
							] as const
						).map((st) => {
							const isSelected = status === st;
							return (
								<Button
									key={st}
									type="button"
									size="sm"
									variant={
										isSelected ? "primary" : "secondary"
									}
									onPress={() => setStatus(st)}
									className="capitalize"
								>
									{st.replace("_", " ")}
								</Button>
							);
						})}
					</div>
				</div>

				{/* Period End Extension */}
				<div className="flex flex-col gap-1.5">
					<label className="text-xs font-medium text-muted">
						Period End (Expiration Date)
					</label>
					<Input
						variant="secondary"
						type="date"
						value={periodEnd}
						onChange={(e) => setPeriodEnd(e.target.value)}
						required
					/>
					<span className="text-[11px] text-muted">
						Extending this date allows the user to retain
						uninterrupted access without immediate charge.
					</span>
				</div>

				{/* Scheduled Tier (Pending Downgrade) */}
				<div className="flex flex-col gap-1.5">
					<label className="text-xs font-medium text-muted">
						Scheduled Tier (Downgrade Target)
					</label>
					<div className="flex items-center gap-2">
						<Input
							variant="secondary"
							placeholder="None (leaves unchanged)"
							value={scheduledTier}
							onChange={(e) => setScheduledTier(e.target.value)}
						/>
						{scheduledTier && (
							<Button
								size="sm"
								variant="secondary"
								type="button"
								onPress={() => setScheduledTier("")}
							>
								Clear
							</Button>
						)}
					</div>
				</div>

				{/* Cancel At Period End Toggle */}
				<div className="flex items-center rounded-medium border border-separator p-3">
					<Switch
						className="w-full"
						isSelected={cancelAtPeriodEnd}
						onChange={setCancelAtPeriodEnd}
					>
						<Switch.Content className="w-full justify-between">
							<div className="flex flex-col gap-0.5">
								<Label>Cancel At Period End</Label>
								<Description>
									Do not automatically renew next cycle
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
				<Button
					variant="primary"
					type="submit"
					isPending={updateMutation.isPending}
				>
					Apply Override
				</Button>
			</ModalFooter>
		</form>
	);
};

export const SubscriptionOverrideModal: React.FC<
	SubscriptionOverrideModalProps
> = ({ subscription, isOpen, onOpenChange }) => {
	if (!subscription) {
		return null;
	}

	return (
		<ModalBackdrop isOpen={isOpen} onOpenChange={onOpenChange}>
			<ModalContainer size="md">
				<ModalDialog>
					<ModalCloseTrigger />
					<ModalHeader>
						<ModalHeading>
							Manual Subscription Override
						</ModalHeading>
					</ModalHeader>

					{isOpen && (
						<SubscriptionOverrideForm
							key={subscription.id}
							subscription={subscription}
							onOpenChange={onOpenChange}
						/>
					)}
				</ModalDialog>
			</ModalContainer>
		</ModalBackdrop>
	);
};

SubscriptionOverrideModal.displayName = "SubscriptionOverrideModal";
