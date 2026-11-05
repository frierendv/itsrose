"use client";

import { ArrowLeft } from "@gravity-ui/icons";
import { buttonVariants } from "@heroui/react";
import NextLink from "next/link";
import { TransactionEventsTable } from "../components/events/transaction-events-table";
import { AdminPage } from "../components/shell";
import { ADMIN_ROUTES } from "../routes";

export const AdminEventsPage: React.FC = () => (
	<AdminPage
		actions={
			<NextLink
				className={buttonVariants({ size: "sm", variant: "outline" })}
				href={ADMIN_ROUTES.billingInvoices}
				prefetch={false}
			>
				<ArrowLeft aria-hidden />
				<span>Invoices</span>
			</NextLink>
		}
		description="Payment gateway callbacks, settlement confirmations, invoice voids and lifecycle events."
		title="Transaction events"
	>
		<TransactionEventsTable />
	</AdminPage>
);

AdminEventsPage.displayName = "AdminEventsPage";
