"use client";

import { Vault } from "@gravity-ui/icons";
import { buttonVariants, Typography } from "@heroui/react";
import NextLink from "next/link";
import { InvoiceTable } from "../components/invoices/invoice-table";

export const AdminInvoicesPage: React.FC = () => {
	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-col gap-1">
				<div className="flex justify-between items-center gap-2">
					<Typography type="h2">
						Financial Ledger & Invoices
					</Typography>
					<NextLink
						href="transaction/events"
						className={buttonVariants({
							size: "sm",
							variant: "outline",
						})}
						prefetch={false}
					>
						<Vault aria-hidden />
						<span>Events</span>
					</NextLink>
				</div>
				<Typography type="body-sm" color="muted">
					Audit transaction records, inspect prorated deductions, copy
					active Midtrans payment links, and void pending invoices.
				</Typography>
			</div>

			<InvoiceTable />
		</div>
	);
};

AdminInvoicesPage.displayName = "AdminInvoicesPage";
