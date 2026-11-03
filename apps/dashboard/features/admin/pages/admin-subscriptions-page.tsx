"use client";

import { Typography } from "@heroui/react";
import { SubscriptionTable } from "../components/subscriptions/subscription-table";
import { TriggerCronButton } from "../components/subscriptions/trigger-cron-button";

export const AdminSubscriptionsPage: React.FC = () => {
	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-col gap-1">
				<div className="flex items-center justify-between">
					<Typography type="h2">Subscription Management</Typography>
					<TriggerCronButton />
				</div>
				<Typography type="body-sm" color="muted">
					Inspect platform subscriptions, perform tier overrides,
					extend billing period dates, and monitor renewal states.
				</Typography>
			</div>

			<SubscriptionTable />
		</div>
	);
};

AdminSubscriptionsPage.displayName = "AdminSubscriptionsPage";
