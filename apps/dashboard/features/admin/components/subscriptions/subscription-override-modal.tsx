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
	TextField,
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

	const handleSave = async (e: React.SyntheticEvent<HTMLFormElement>) => {
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
				user_id: subscription.user_id,
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
		<Form onSubmit={handleSave}>
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
					<Label>Assign Tier</Label>
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
					<Label>Lifecycle Status</Label>
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
				<TextField
					isRequired
					name="period_end"
					type="date"
					value={periodEnd}
					onChange={setPeriodEnd}
				>
					<Label>Period End (Expiration Date)</Label>
					<Input variant="secondary" />
					<Description>
						Extending this date allows the user to retain
						uninterrupted access without immediate charge.
					</Description>
				</TextField>

				{/* Scheduled Tier (Pending Downgrade) */}
				<TextField
					name="scheduled_tier"
					value={scheduledTier}
					onChange={setScheduledTier}
				>
					<Label>Scheduled Tier (Downgrade Target)</Label>
					<div className="flex items-center gap-2">
						<Input
							variant="secondary"
							placeholder="None (leaves unchanged)"
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
				</TextField>

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
		</Form>
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
