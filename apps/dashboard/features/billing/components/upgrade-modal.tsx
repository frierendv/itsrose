"use client";

import { getErrorMessage } from "@/lib/errors";
import { Wallet } from "@gravity-ui/icons";
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
	Separator,
	toast,
	Typography,
} from "@heroui/react";
import type { ApiPlan, Subscription } from "@itsrose/auth-billing";
import { useUpgradeMutation } from "../hooks";
import { calculateProrationPreview, formatDateID, formatIDR } from "../utils";

export interface UpgradeModalProps {
	targetPlan: ApiPlan | null;
	subscription?: Subscription | null;
	/**
	 * Current price of the plan the customer is on, in the smallest unit.
	 * Taken from the live plan list so the preview quotes what the server
	 * charges.
	 */
	currentTierPrice: number;
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({
	targetPlan,
	subscription,
	currentTierPrice,
	isOpen,
	onOpenChange,
}) => {
	const upgradeMutation = useUpgradeMutation();

	if (!targetPlan) {
		return null;
	}

	const currentTier = (subscription?.plan_id || "free").toLowerCase();
	const targetTier = targetPlan.plan_id.toLowerCase();

	const proration = calculateProrationPreview({
		currentTier,
		targetTier,
		currentTierPrice,
		targetTierPrice: targetPlan.price.amount,
		periodStart: subscription?.period_start,
		periodEnd: subscription?.period_end,
	});

	const handleProceed = async () => {
		try {
			const result = await upgradeMutation.mutateAsync({
				targetTier: targetPlan.plan_id,
			});

			const paymentUrl = result?.invoice?.payment_link_url;

			if (!paymentUrl) {
				toast.danger(
					"Invoice generated, but no payment link was received. Please check your invoice history."
				);
				onOpenChange(false);
				return;
			}

			toast.success(
				"Upgrade invoice created! Redirecting to secure Midtrans payment..."
			);
			onOpenChange(false);

			// Redirect to Midtrans payment portal
			window.location.href = paymentUrl;
		} catch (err) {
			toast.danger(
				getErrorMessage(
					err,
					"Failed to initiate upgrade invoice. Please try again."
				)
			);
		}
	};

	const renewalDateStr = formatDateID(proration.renewalDate);
	const fullPriceStr = formatIDR(proration.fullRenewalPrice);

	return (
		<ModalBackdrop isOpen={isOpen} onOpenChange={onOpenChange}>
			<ModalContainer size="md">
				<ModalDialog>
					<ModalCloseTrigger />
					<ModalHeader>
						<ModalHeading>
							Upgrade to {targetPlan.name}
						</ModalHeading>
					</ModalHeader>

					<ModalBody className="flex flex-col gap-4">
						<Typography type="body-sm" color="muted">
							Review the prorated calculation for upgrading your
							workspace mid-cycle. Your features will unlock
							instantly upon payment confirmation.
						</Typography>

						{/* Audit Breakdown Box */}
						<div className="flex flex-col gap-2.5 p-3.5 border border-separator">
							<div className="flex justify-between items-center">
								<Typography type="body-xs" color="muted">
									Target Plan Rate
								</Typography>
								<Typography type="body-sm">
									{formatIDR(proration.targetTierPrice)} / mo
								</Typography>
							</div>

							{!proration.isCycleReset && (
								<>
									<div className="flex justify-between items-center">
										<Typography
											type="body-xs"
											color="muted"
										>
											Prorated Target Tier (
											{proration.remainingDays} days
											remaining)
										</Typography>
										<Typography type="body-sm">
											{formatIDR(
												proration.proratedTargetCost
											)}
										</Typography>
									</div>

									<div className="flex justify-between items-center">
										<Typography
											type="body-xs"
											color="muted"
										>
											Current Plan Credit (Unused)
										</Typography>
										<Typography
											type="body-sm"
											className="text-success"
										>
											–{" "}
											{formatIDR(proration.unusedCredit)}
										</Typography>
									</div>
								</>
							)}

							<Separator />

							<div className="flex justify-between items-baseline pt-1">
								<div className="flex flex-col">
									<Typography type="h5">
										Net Due Today
									</Typography>
									<Typography type="body-xs" color="muted">
										{proration.isCycleReset
											? "Standard 30-day billing cycle"
											: "Net prorated difference"}
									</Typography>
								</div>
								<Typography type="h3">
									{formatIDR(proration.netPayable)}
								</Typography>
							</div>
						</div>

						{/* Renewal Disclaimer */}
						<div className="flex flex-col gap-1 p-3 bg-surface-secondary">
							<Typography type="body-xs" color="muted">
								Renewal Disclaimer:
							</Typography>
							<Typography type="body-xs">
								Next standard billing cycle starts on{" "}
								<strong>{renewalDateStr}</strong> at{" "}
								<strong>{fullPriceStr}</strong>.
							</Typography>
						</div>
					</ModalBody>

					<ModalFooter>
						<Button
							slot="close"
							variant="tertiary"
							isDisabled={upgradeMutation.isPending}
						>
							Cancel
						</Button>
						<Button
							variant="primary"
							isPending={upgradeMutation.isPending}
							isDisabled={upgradeMutation.isPending}
							onPress={handleProceed}
						>
							<Wallet aria-hidden className="size-4" />
							<span>Proceed to Payment</span>
						</Button>
					</ModalFooter>
				</ModalDialog>
			</ModalContainer>
		</ModalBackdrop>
	);
};

UpgradeModal.displayName = "UpgradeModal";
