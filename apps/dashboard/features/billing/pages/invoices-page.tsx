"use client";

import { config } from "@/config";
import { Alert, Typography } from "@heroui/react";
import { InvoiceTable } from "../components";

export const InvoicesPage: React.FC = () => {
	return (
		<div className="flex flex-col gap-6">
			{/* Page Header */}
			<div className="flex flex-col gap-1">
				<Typography type="h2">Invoices & Receipts</Typography>
				<Typography type="body-sm" color="muted">
					Review your transaction history, settle pending payments,
					and download official VAT tax receipts.
				</Typography>
			</div>

			{/* Notice Banner */}
			<Alert status="accent" className="w-full">
				<Alert.Indicator />
				<Alert.Content>
					<Alert.Description>
						{config.APP_NAME} generates automated invoices for all
						subscription renewals and upgrades. Receipts are issued
						immediately upon payment settlement.
					</Alert.Description>
				</Alert.Content>
			</Alert>

			{/* Interactive Invoices Table with Sorting, Filters, & Pagination */}
			<InvoiceTable pageSize={10} showFilters showPagination />
		</div>
	);
};

InvoicesPage.displayName = "InvoicesPage";
