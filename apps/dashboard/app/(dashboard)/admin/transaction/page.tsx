import { AdminInvoicesPage } from "@/features/admin";
import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Transactions",
	description: "Platform transaction logs and financial billing records.",
};

export default function TransactionsPage() {
	return <AdminInvoicesPage />;
}
