"use client";

import { AdminPage } from "../components/shell";
import { OperationsPanel } from "../components/usage/operations-panel";

export const AdminOperationsPage: React.FC = () => (
	<AdminPage
		description="Manual metering and billing jobs. Each action is idempotent; the result shown is from the latest run in this session."
		title="Metering operations"
	>
		<OperationsPanel />
	</AdminPage>
);

AdminOperationsPage.displayName = "AdminOperationsPage";
