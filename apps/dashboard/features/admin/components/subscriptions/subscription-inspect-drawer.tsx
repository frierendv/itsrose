"use client";

import { JsonView } from "@/components/json-view";
import { Button, Separator, Surface, Typography } from "@heroui/react";
import type { Subscription } from "@itsrose/auth-billing";
import { formatDateTime, getSubscriptionStatusProps } from "../../utils";
import { EntityDrawer } from "../shell";

export interface SubscriptionInspectDrawerProps {
	subscription: Subscription | null;
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
}

export type SubscriptionDetailOverviewProps = Pick<
	SubscriptionInspectDrawerProps,
	"subscription"
>;

export interface SubscriptionDetailOverviewRawProps extends SubscriptionDetailOverviewProps {
	/**
	 * Display heading
	 *
	 * @default "Raw Subscription Payload (System Audit)"
	 */
	label?: string;
}
/** Grid detail overview */
export const SubscriptionDetailOverview: React.FC<
	SubscriptionDetailOverviewProps
> = ({ subscription }) => {
	if (!subscription) {
		return null;
	}
	return (
		<Surface className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
			<div>
				<span className="text-muted">Subscription ID:</span>
				<p className="font-mono font-medium text-foreground select-all">
					{subscription.id}
				</p>
			</div>
			<div>
				<span className="text-muted">User ID:</span>
				<p className="font-mono font-medium text-foreground select-all">
					{subscription.user_id}
				</p>
			</div>
			<div>
				<span className="text-muted">Active Tier:</span>
				<p className="font-semibold text-foreground uppercase">
					{subscription.plan_id}
				</p>
			</div>
			<div>
				<span className="text-muted">Scheduled Tier (Next Cycle):</span>
				<p className="font-medium text-foreground">
					{subscription.scheduled_tier
						? subscription.scheduled_tier.toUpperCase()
						: "None (Renewal at current tier)"}
				</p>
			</div>
			<div>
				<span className="text-muted">Current Period Start:</span>
				<p className="text-foreground">
					{formatDateTime(subscription.period_start)}
				</p>
			</div>
			<div>
				<span className="text-muted">Current Period End:</span>
				<p className="text-foreground">
					{formatDateTime(subscription.period_end)}
				</p>
			</div>
			<div>
				<span className="text-muted">Grace Period End:</span>
				<p className="text-foreground">
					{subscription.grace_period_end
						? formatDateTime(subscription.grace_period_end)
						: "Not in grace"}
				</p>
			</div>
			<div>
				<span className="text-muted">Cancel At Period End:</span>
				<p className="text-foreground font-medium">
					{subscription.cancel_at_period_end ? "Yes" : "No"}
				</p>
			</div>
			<div>
				<span className="text-muted">Associated Invoice ID:</span>
				<p className="font-mono text-foreground select-all">
					{subscription.invoice_id || "None"}
				</p>
			</div>
			<div>
				<span className="text-muted">Associated Order ID:</span>
				<p className="font-mono text-foreground select-all">
					{subscription.order_id || "None"}
				</p>
			</div>
		</Surface>
	);
};

/** Raw Subscription Payload (System Audit) */
export const SubscriptionDetailOverviewRaw: React.FC<
	SubscriptionDetailOverviewRawProps
> = ({ subscription, label = "Raw Subscription Payload (System Audit)" }) => {
	if (!subscription) {
		return null;
	}

	return (
		<div className="flex flex-col gap-1.5">
			<Typography type="body-xs" color="muted">
				{label}
			</Typography>
			<JsonView value={subscription} />
		</div>
	);
};

export const SubscriptionInspectDrawer: React.FC<
	SubscriptionInspectDrawerProps
> = ({ subscription, isOpen, onOpenChange }) => {
	if (!subscription) {
		return null;
	}

	const statusProps = getSubscriptionStatusProps(subscription.status);

	return (
		<EntityDrawer
			description={`Status: ${statusProps.label}`}
			footer={
				<Button variant="outline" onPress={() => onOpenChange(false)}>
					Close
				</Button>
			}
			isOpen={isOpen}
			onOpenChange={onOpenChange}
			title="Subscription inspector"
		>
			<div className="flex flex-col gap-4">
				<SubscriptionDetailOverview subscription={subscription} />
				<Separator />
				<SubscriptionDetailOverviewRaw subscription={subscription} />
			</div>
		</EntityDrawer>
	);
};

SubscriptionInspectDrawer.displayName = "SubscriptionInspectDrawer";
