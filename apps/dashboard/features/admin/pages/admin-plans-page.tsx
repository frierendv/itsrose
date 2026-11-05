"use client";

import { PlanTable } from "../components/plans/plan-table";
import { AdminPage } from "../components/shell";

export const AdminPlansPage: React.FC = () => (
	<AdminPage
		description="Configure plans, prices and the monthly request allowance that drives quota enforcement."
		title="Billing plans"
	>
		<PlanTable />
	</AdminPage>
);

AdminPlansPage.displayName = "AdminPlansPage";
