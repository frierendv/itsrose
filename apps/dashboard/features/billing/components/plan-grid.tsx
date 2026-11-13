"use client";

import { CircleCheckFill, StarFill } from "@gravity-ui/icons";
import {
	Button,
	Card,
	Chip,
	Separator,
	Skeleton,
	Typography,
} from "@heroui/react";
import {
	PLAN_TIER_RANK,
	type ApiPlan,
	type Subscription,
} from "@itsrose/auth-billing";
import { useState } from "react";
import { formatIDR, isDowngrade, isUpgrade } from "../utils";
import { DowngradeModal } from "./downgrade-modal";
import { UpgradeModal } from "./upgrade-modal";

export interface PlanGridProps {
	plans: ApiPlan[];
	subscription?: Subscription | null;
	isPending?: boolean;
}

export const PlanGrid: React.FC<PlanGridProps> = ({
	plans,
	subscription,
	isPending,
}) => {
	const [upgradePlan, setUpgradePlan] = useState<ApiPlan | null>(null);
	const [downgradePlan, setDowngradePlan] = useState<ApiPlan | null>(null);

	if (isPending) {
		return <PlanGridSkeleton />;
	}

	const currentTierId = (subscription?.plan_id || "free").toLowerCase();
	const scheduledTierId = subscription?.scheduled_tier?.toLowerCase();

	// The price of the plan the customer is on now, taken from the live plan
	// list. A plan's price is mutable, so the upgrade preview must use the
	// same price the server will charge.
	const currentTierPrice =
		plans.find((plan) => plan.plan_id.toLowerCase() === currentTierId)
			?.price.amount ?? 0;

	// Ensure plans are ordered by rank: free (0) -> hobby (1) -> pro (2) -> business (3)
	const sortedPlans = [...plans].sort((a, b) => {
		const rankA = PLAN_TIER_RANK[a.plan_id.toLowerCase()] ?? 0;
		const rankB = PLAN_TIER_RANK[b.plan_id.toLowerCase()] ?? 0;
		return rankA - rankB;
	});

	return (
		<>
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
				{sortedPlans.map((plan) => {
					const planTierId = plan.plan_id.toLowerCase();
					const isCurrent = planTierId === currentTierId;
					const isScheduled = planTierId === scheduledTierId;
					const canUpgrade = isUpgrade(currentTierId, planTierId);
					const canDowngrade = isDowngrade(currentTierId, planTierId);

					return (
						<Card
							key={plan.id || plan.plan_id}
							variant={plan.highlighted ? "default" : "secondary"}
							className="flex flex-col justify-between"
						>
							<Card.Header className="relative flex flex-col items-start gap-3">
								<div className="flex items-center justify-between w-full">
									<Card.Title className="text-xl font-bold">
										{plan.name}
									</Card.Title>
									{plan.highlighted && (
										<Chip
											color="accent"
											size="sm"
											variant="soft"
										>
											<StarFill className="size-3" />
											<span>Popular</span>
										</Chip>
									)}
								</div>

								<Card.Description>
									{plan.description ||
										"Feature-rich API subscription."}
								</Card.Description>

								<div className="flex items-baseline gap-1 pt-1">
									<Typography type="h3">
										{formatIDR(plan.price.amount)}
									</Typography>
									<Typography type="body-xs" color="muted">
										/{plan.price.interval || "month"}
									</Typography>
								</div>
							</Card.Header>

							<Card.Content className="flex flex-col gap-4">
								<Separator />

								<div className="flex flex-col gap-2">
									<Typography
										type="body-xs"
										color="muted"
										className="uppercase tracking-wider"
									>
										Features & Specs
									</Typography>
									<ul className="space-y-2">
										{plan.features?.map((feature) => (
											<li
												key={feature}
												className="flex items-center gap-2"
											>
												<CircleCheckFill className="size-4 shrink-0 text-success" />
												<Typography type="body-sm">
													{feature}
												</Typography>
											</li>
										))}
									</ul>
								</div>
							</Card.Content>

							<Card.Footer className="pt-4">
								{isCurrent ? (
									<Button
										fullWidth
										isDisabled
										variant="outline"
									>
										Current Plan
									</Button>
								) : isScheduled ? (
									<Button
										fullWidth
										isDisabled
										variant="outline"
									>
										Downgrade Scheduled
									</Button>
								) : canUpgrade ? (
									<Button
										fullWidth
										variant="primary"
										onPress={() => setUpgradePlan(plan)}
									>
										Upgrade
									</Button>
								) : canDowngrade ? (
									<Button
										fullWidth
										variant="outline"
										onPress={() => setDowngradePlan(plan)}
									>
										Downgrade
									</Button>
								) : (
									<Button
										fullWidth
										variant="outline"
										isDisabled
									>
										Select Plan
									</Button>
								)}
							</Card.Footer>
						</Card>
					);
				})}
			</div>

			{/* Prorated Upgrade Modal */}
			<UpgradeModal
				targetPlan={upgradePlan}
				subscription={subscription}
				currentTierPrice={currentTierPrice}
				isOpen={Boolean(upgradePlan)}
				onOpenChange={(open) => {
					if (!open) {
						setUpgradePlan(null);
					}
				}}
			/>

			{/* Scheduled Downgrade Modal */}
			<DowngradeModal
				targetPlan={downgradePlan}
				subscription={subscription}
				isOpen={Boolean(downgradePlan)}
				onOpenChange={(open) => {
					if (!open) {
						setDowngradePlan(null);
					}
				}}
			/>
		</>
	);
};

export const PlanGridSkeleton: React.FC = () => (
	<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
		{Array.from({ length: 4 }).map((_, i) => (
			<Card key={i} variant="default" className="space-y-4 p-5">
				<Skeleton className="h-6 w-28" />
				<Skeleton className="h-4 w-40" />
				<Skeleton className="h-8 w-24" />
				<Skeleton className="h-32 w-full" />
				<Skeleton className="h-9 w-full" />
			</Card>
		))}
	</div>
);

PlanGrid.displayName = "PlanGrid";
PlanGridSkeleton.displayName = "PlanGridSkeleton";
