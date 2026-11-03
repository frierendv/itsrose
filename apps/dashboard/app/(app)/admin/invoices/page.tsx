import { AdminInvoicesPage } from "@/features/admin";
import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Invoices Ledger",
	description:
		"Platform billing invoices, proration audit, and payment links.",
};

export default function InvoicesPage() {
	return <AdminInvoicesPage />;
}
