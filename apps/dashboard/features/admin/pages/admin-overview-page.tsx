"use client";

import { Typography } from "@heroui/react";
import { AdminMetricsCards } from "../components/overview/admin-metrics-cards";
import { PlanTable } from "../components/plans/plan-table";
import { SubscriptionTable } from "../components/subscriptions/subscription-table";

export const AdminOverviewPage: React.FC = () => {
	return (
		<div className="flex flex-col gap-6">
			{/* Page Header */}
			<div className="flex flex-col gap-1">
				<Typography type="h2">Admin Command Center</Typography>
				<Typography type="body-sm" color="muted">
					Overview of platform subscription health, monthly recurring
					revenue, and pending billing actions.
				</Typography>
			</div>

			{/* Core Metric Cards */}
			<AdminMetricsCards />

			{/* Active Subscriptions Overview */}
			<div className="flex flex-col gap-3 pt-2">
				<div className="flex flex-col gap-1">
					<Typography type="h3">Subscription Health</Typography>
					<Typography type="body-xs" color="muted">
						Recent subscriptions, renewal states, and downgrade
						schedules.
					</Typography>
				</div>
				<SubscriptionTable />
			</div>

			{/* Plan Catalog Overview */}
			<div className="flex flex-col gap-3 pt-4">
				<div className="flex flex-col gap-1">
					<Typography type="h3">Plan Catalog</Typography>
					<Typography type="body-xs" color="muted">
						Tier pricing, request rate limits, and configuration.
					</Typography>
				</div>
				<PlanTable />
			</div>
		</div>
	);
};

AdminOverviewPage.displayName = "AdminOverviewPage";
