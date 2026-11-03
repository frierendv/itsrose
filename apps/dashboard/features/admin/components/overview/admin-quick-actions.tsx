"use client";

import {
	ArrowRotateRight,
	ArrowsRotateLeft,
	CreditCard,
	LayersVertical,
	Persons,
	Receipt,
	Shield,
} from "@gravity-ui/icons";
import { Button, buttonVariants, Card } from "@heroui/react";
import Link from "next/link";
import { useState } from "react";
import { useSeedPlansMutation, useTriggerCronMutation } from "../../api";

export const AdminQuickActions: React.FC = () => {
	const triggerCronMutation = useTriggerCronMutation();
	const seedPlansMutation = useSeedPlansMutation();
	const [isCronRunning, setIsCronRunning] = useState(false);

	const handleTriggerCron = async () => {
		try {
			setIsCronRunning(true);
			await triggerCronMutation.mutateAsync({
				lead_days: 3,
				grace_days: 3,
			});
		} finally {
			setIsCronRunning(false);
		}
	};

	const handleSeedPlans = async () => {
		await seedPlansMutation.mutateAsync(true);
	};

	return (
		<Card variant="default">
			<Card.Header className="flex flex-col gap-1">
				<div className="flex items-center gap-2">
					<Shield className="size-5 text-accent" />
					<Card.Title>Admin Operations & Quick Actions</Card.Title>
				</div>
				<Card.Description>
					Execute platform-wide billing tasks and navigate operational
					ledgers.
				</Card.Description>
			</Card.Header>
			<Card.Content className="flex flex-wrap items-center gap-3 pt-2">
				<Link
					href="/admin/plans"
					className={buttonVariants({
						variant: "secondary",
						size: "sm",
					})}
				>
					<LayersVertical className="size-4" />
					Plan Catalog
				</Link>

				<Link
					href="/admin/subscriptions"
					className={buttonVariants({
						variant: "secondary",
						size: "sm",
					})}
				>
					<CreditCard className="size-4" />
					Subscriptions
				</Link>

				<Link
					href="/admin/transaction"
					className={buttonVariants({
						variant: "secondary",
						size: "sm",
					})}
				>
					<Receipt className="size-4" />
					Financial Ledger
				</Link>

				<Link
					href="/admin/users"
					className={buttonVariants({
						variant: "secondary",
						size: "sm",
					})}
				>
					<Persons className="size-4" />
					User Directory
				</Link>

				<Button
					variant="secondary"
					size="sm"
					onPress={handleTriggerCron}
					isPending={isCronRunning || triggerCronMutation.isPending}
				>
					<ArrowRotateRight className="size-4" />
					Run Billing Cron
				</Button>

				<Button
					variant="secondary"
					size="sm"
					onPress={handleSeedPlans}
					isPending={seedPlansMutation.isPending}
				>
					<ArrowsRotateLeft className="size-4" />
					Seed Default Plans
				</Button>
			</Card.Content>
		</Card>
	);
};

AdminQuickActions.displayName = "AdminQuickActions";
