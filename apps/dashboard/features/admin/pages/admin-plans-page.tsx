"use client";

import { Typography } from "@heroui/react";
import { PlanTable } from "../components/plans/plan-table";

export const AdminPlansPage: React.FC = () => {
	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-col gap-1">
				<Typography type="h2">Billing Plans & Tiers</Typography>
				<Typography type="body-sm" color="muted">
					Configure available subscription plans, rate limits (RPM),
					and monthly prices in IDR.
				</Typography>
			</div>

			<PlanTable />
		</div>
	);
};

AdminPlansPage.displayName = "AdminPlansPage";
