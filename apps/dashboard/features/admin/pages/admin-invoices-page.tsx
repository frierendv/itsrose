"use client";

import { Vault } from "@gravity-ui/icons";
import { buttonVariants } from "@heroui/react";
import NextLink from "next/link";
import { InvoiceTable } from "../components/invoices/invoice-table";
import { AdminPage } from "../components/shell";
import { ADMIN_ROUTES } from "../routes";

export const AdminInvoicesPage: React.FC = () => (
	<AdminPage
		actions={
			<NextLink
				className={buttonVariants({ size: "sm", variant: "outline" })}
				href={ADMIN_ROUTES.billingEvents}
				prefetch={false}
			>
				<Vault aria-hidden />
				<span>Events</span>
			</NextLink>
		}
		description="Audit invoices, inspect proration math, copy payment links and void pending invoices."
		title="Invoices"
	>
		<InvoiceTable />
	</AdminPage>
);

AdminInvoicesPage.displayName = "AdminInvoicesPage";
