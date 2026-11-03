"use client";

import {
	CircleCheckFill,
	Clock,
	LayersVertical,
	Speedometer,
} from "@gravity-ui/icons";
import { Card, Chip, Separator, Skeleton, Typography } from "@heroui/react";
import {
	STANDARD_TIER_RATES,
	STANDARD_TIER_RPM,
	type ApiPlan,
	type PlanTier,
	type Subscription,
} from "@itsrose/auth-billing";
import { formatDateID, formatIDR, getSubscriptionStatusProps } from "../utils";

export interface ActiveSubscriptionCardProps {
	subscription?: Subscription | null;
	plans: ApiPlan[];
	isPending?: boolean;
}

export const ActiveSubscriptionCard: React.FC<ActiveSubscriptionCardProps> = ({
	subscription,
	plans,
	isPending,
}) => {
	if (isPending) {
		return <ActiveSubscriptionCardSkeleton />;
	}

	const planId = (subscription?.plan_id || "free").toLowerCase();
	const activePlan = plans.find((p) => p.plan_id.toLowerCase() === planId);

	const isPaid =
		Boolean(subscription) &&
		planId !== "free" &&
		subscription?.status === "active";

	const statusInfo = getSubscriptionStatusProps(
		subscription?.status || "active"
	);

	const planPrice =
		activePlan?.price?.amount ??
		(STANDARD_TIER_RATES[planId as PlanTier] || 0);

	const rateLimitMax =
		activePlan?.limits?.max ??
		(STANDARD_TIER_RPM[planId as PlanTier] || 10);

	return (
		<Card variant="default">
			<Card.Header>
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
					<div className="flex flex-col gap-1.5">
						<div className="flex items-center gap-2.5">
							<Card.Title>
								{activePlan?.name || "Free Plan"}
							</Card.Title>
							<Chip
								color={statusInfo.color}
								size="sm"
								variant="soft"
							>
								{statusInfo.label}
							</Chip>
							{subscription?.scheduled_tier && (
								<Chip color="warning" size="sm" variant="soft">
									Downgrade Pending
								</Chip>
							)}
						</div>
						<Card.Description>
							{activePlan?.description ||
								"Standard access to the platform."}
						</Card.Description>
					</div>

					<div className="flex flex-col sm:items-end">
						<div className="flex items-baseline gap-1">
							<Typography type="h2">
								{formatIDR(planPrice)}
							</Typography>
							<Typography type="body-xs" color="muted">
								/{activePlan?.price?.interval || "month"}
							</Typography>
						</div>
						<Typography type="body-xs" color="muted">
							{isPaid
								? `Billed ${activePlan?.price?.interval || "month"}ly`
								: "No recurring billing"}
						</Typography>
					</div>
				</div>
			</Card.Header>

			<Card.Content className="flex flex-col gap-5">
				{/* Plan Specs & Limits */}
				<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
					<div className="flex items-start gap-3">
						<div className="p-2 text-muted shrink-0">
							<Speedometer className="size-5" />
						</div>
						<div className="flex flex-col">
							<Typography type="body-xs" color="muted">
								Rate Limit
							</Typography>
							<Typography type="body-sm">
								{rateLimitMax} Requests / Min
							</Typography>
						</div>
					</div>

					<div className="flex items-start gap-3">
						<div className="p-2 text-muted shrink-0">
							<Clock className="size-5" />
						</div>
						<div className="flex flex-col">
							<Typography type="body-xs" color="muted">
								Billing Cycle
							</Typography>
							<Typography type="body-sm">
								{isPaid && subscription?.period_end
									? `Renews ${formatDateID(subscription.period_end)}`
									: "Continuous (Free Tier)"}
							</Typography>
						</div>
					</div>

					<div className="flex items-start gap-3">
						<div className="p-2 text-muted shrink-0">
							<LayersVertical className="size-5" />
						</div>
						<div className="flex flex-col">
							<Typography type="body-xs" color="muted">
								Current Period
							</Typography>
							<Typography type="body-sm">
								{subscription?.period_start
									? `${formatDateID(subscription.period_start)} – ${formatDateID(subscription.period_end)}`
									: "Ongoing"}
							</Typography>
						</div>
					</div>
				</div>

				<Separator />

				{/* Features list */}
				<div className="flex flex-col gap-2.5">
					<Typography type="h5">Included in your plan</Typography>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
						{activePlan?.features?.map((feature) => (
							<div
								key={feature}
								className="flex items-center gap-2"
							>
								<CircleCheckFill className="size-4 shrink-0 text-success" />
								<Typography type="body-sm">
									{feature}
								</Typography>
							</div>
						))}
					</div>
				</div>
			</Card.Content>
		</Card>
	);
};

export const ActiveSubscriptionCardSkeleton: React.FC = () => (
	<Card variant="default">
		<Card.Header>
			<div className="flex justify-between items-center w-full">
				<div className="space-y-2">
					<Skeleton className="h-6 w-36" />
					<Skeleton className="h-4 w-56" />
				</div>
				<Skeleton className="h-8 w-28" />
			</div>
		</Card.Header>
		<Card.Content className="space-y-4">
			<div className="grid grid-cols-3 gap-4">
				<Skeleton className="h-12 w-full" />
				<Skeleton className="h-12 w-full" />
				<Skeleton className="h-12 w-full" />
			</div>
			<Skeleton className="h-16 w-full" />
		</Card.Content>
	</Card>
);

ActiveSubscriptionCard.displayName = "ActiveSubscriptionCard";
ActiveSubscriptionCardSkeleton.displayName = "ActiveSubscriptionCardSkeleton";
