"use client";

import { Typography } from "@heroui/react";
import { TransactionEventsTable } from "../components/events/transaction-events-table";

export const AdminEventsPage: React.FC = () => {
	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-col gap-1">
				<Typography type="h2">Transaction Event Flow</Typography>
				<Typography type="body-sm" color="muted">
					Real-time audit log of payment gateway webhooks, settlement
					confirmations, invoice voids, and lifecycle events.
				</Typography>
			</div>

			<TransactionEventsTable />
		</div>
	);
};

AdminEventsPage.displayName = "AdminEventsPage";
