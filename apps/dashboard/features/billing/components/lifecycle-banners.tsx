"use client";

import { Alert, Button, toast } from "@heroui/react";
import type { Invoice, Subscription } from "@itsrose/auth-billing";
import { useCancelDowngradeMutation } from "../hooks";
import { formatDateID } from "../utils";

export interface LifecycleBannersProps {
	subscription?: Subscription | null;
	pendingInvoice?: Invoice | null;
}

export const LifecycleBanners: React.FC<LifecycleBannersProps> = ({
	subscription,
	pendingInvoice,
}) => {
	const cancelDowngradeMutation = useCancelDowngradeMutation();

	if (!subscription) {
		return null;
	}

	const isPastDue = subscription.status === "past_due";
	const hasScheduledDowngrade = Boolean(subscription.scheduled_tier);

	const handleCancelDowngrade = () => {
		cancelDowngradeMutation.mutate(undefined, {
			onSuccess: (data) => {
				toast.success(
					data.message ||
						"Scheduled downgrade canceled. You will renew on your current plan."
				);
			},
			onError: (err: any) => {
				toast.danger(
					err?.message ||
						"Failed to cancel downgrade. Please contact support."
				);
			},
		});
	};

	const scheduledTierName =
		subscription.scheduled_tier?.toUpperCase() || "NEW TIER";
	const currentTierName = subscription.plan_id.toUpperCase();
	const periodEndDate = formatDateID(subscription.period_end);
	const graceEndDate = subscription.grace_period_end
		? formatDateID(subscription.grace_period_end)
		: formatDateID(
				new Date(
					new Date(subscription.period_end).getTime() +
						3 * 24 * 60 * 60 * 1000
				)
			);

	const paymentLink =
		pendingInvoice?.payment_link_url ||
		pendingInvoice?.payment_url ||
		"/account/billing/invoices";

	return (
		<div className="flex flex-col gap-3">
			{/* Past-Due Lifecycle Banner */}
			{isPastDue && (
				<Alert status="warning">
					<Alert.Indicator />
					<Alert.Content>
						<Alert.Title>Payment Past Due</Alert.Title>
						<Alert.Description>
							Your subscription renewal is past due. Your grace
							period is active until{" "}
							<strong>{graceEndDate}</strong>. Please settle your
							outstanding invoice to prevent account expiration.
						</Alert.Description>
						{paymentLink && (
							<div className="mt-2 flex items-center gap-2">
								<a
									href={paymentLink}
									target={
										paymentLink.startsWith("http")
											? "_blank"
											: "_self"
									}
									rel="noopener noreferrer"
								>
									<Button size="sm" variant="primary">
										Pay Outstanding Invoice
									</Button>
								</a>
							</div>
						)}
					</Alert.Content>
				</Alert>
			)}

			{/* Scheduled Downgrade Lifecycle Banner */}
			{hasScheduledDowngrade && (
				<Alert status="accent">
					<Alert.Indicator />
					<Alert.Content>
						<Alert.Title>Downgrade Scheduled</Alert.Title>
						<Alert.Description>
							Plan changes to <strong>{scheduledTierName}</strong>{" "}
							on <strong>{periodEndDate}</strong>. Full{" "}
							<strong>{currentTierName}</strong> features remain
							active until then.
						</Alert.Description>
						<div className="mt-2.5">
							<Button
								variant="danger-soft"
								size="sm"
								isPending={cancelDowngradeMutation.isPending}
								isDisabled={cancelDowngradeMutation.isPending}
								onPress={handleCancelDowngrade}
							>
								Cancel Downgrade
							</Button>
						</div>
					</Alert.Content>
				</Alert>
			)}
		</div>
	);
};

LifecycleBanners.displayName = "LifecycleBanners";
