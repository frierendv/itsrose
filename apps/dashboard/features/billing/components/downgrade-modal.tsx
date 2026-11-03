"use client";

import {
	Button,
	ModalBackdrop,
	ModalBody,
	ModalCloseTrigger,
	ModalContainer,
	ModalDialog,
	ModalFooter,
	ModalHeader,
	ModalHeading,
	toast,
	Typography,
} from "@heroui/react";
import type { ApiPlan, Subscription } from "@itsrose/auth/itsrose";
import { useDowngradeMutation } from "../hooks";
import { formatDateID, formatIDR } from "../utils";

export interface DowngradeModalProps {
	targetPlan: ApiPlan | null;
	subscription?: Subscription | null;
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
}

export const DowngradeModal: React.FC<DowngradeModalProps> = ({
	targetPlan,
	subscription,
	isOpen,
	onOpenChange,
}) => {
	const downgradeMutation = useDowngradeMutation();

	if (!targetPlan) {
		return null;
	}

	const periodEndDate = formatDateID(subscription?.period_end);
	const targetPlanPrice = formatIDR(targetPlan.price.amount);
	const currentTierName = (subscription?.plan_id || "current").toUpperCase();

	const handleConfirm = async () => {
		try {
			const res = await downgradeMutation.mutateAsync({
				targetTier: targetPlan.plan_id,
			});

			toast.success(
				res.message ||
					`Downgrade to ${targetPlan.name} scheduled for cycle end.`
			);
			onOpenChange(false);
		} catch (err: any) {
			toast.danger(
				err?.message ||
					"Failed to schedule downgrade. Please try again or contact support."
			);
		}
	};

	return (
		<ModalBackdrop isOpen={isOpen} onOpenChange={onOpenChange}>
			<ModalContainer size="md">
				<ModalDialog>
					<ModalCloseTrigger />
					<ModalHeader>
						<ModalHeading>
							Schedule Downgrade to {targetPlan.name}
						</ModalHeading>
					</ModalHeader>

					<ModalBody className="flex flex-col gap-4">
						{/* Disclosure Notice Box */}
						<div className="flex flex-col gap-2 p-3.5 bg-surface-secondary border border-separator">
							<Typography type="body-sm">
								No payment is due today. You retain full{" "}
								<strong>{currentTierName}</strong> features
								until <strong>{periodEndDate}</strong>.
							</Typography>
							<Typography type="body-sm" color="muted">
								Your next standard billing cycle will renew on{" "}
								<strong>{periodEndDate}</strong> at{" "}
								<strong>{targetPlanPrice}</strong>.
							</Typography>
						</div>

						<Typography type="body-xs" color="muted">
							You can cancel this downgrade anytime before your
							cycle renews without interruption.
						</Typography>
					</ModalBody>

					<ModalFooter>
						<Button
							slot="close"
							variant="tertiary"
							isDisabled={downgradeMutation.isPending}
						>
							Cancel
						</Button>
						<Button
							variant="danger"
							isPending={downgradeMutation.isPending}
							isDisabled={downgradeMutation.isPending}
							onPress={handleConfirm}
						>
							Confirm Downgrade
						</Button>
					</ModalFooter>
				</ModalDialog>
			</ModalContainer>
		</ModalBackdrop>
	);
};

DowngradeModal.displayName = "DowngradeModal";
