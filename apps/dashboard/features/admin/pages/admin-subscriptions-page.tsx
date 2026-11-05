"use client";

import { AdminPage } from "../components/shell";
import { SubscriptionTable } from "../components/subscriptions/subscription-table";

export const AdminSubscriptionsPage: React.FC = () => (
	<AdminPage
		description="Inspect subscriptions, apply manual overrides, extend periods and manage cancellation."
		title="Subscriptions"
	>
		<SubscriptionTable />
	</AdminPage>
);

AdminSubscriptionsPage.displayName = "AdminSubscriptionsPage";
