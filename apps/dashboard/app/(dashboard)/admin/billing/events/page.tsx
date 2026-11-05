import { AdminEventsPage } from "@/features/admin";
import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Transaction Event Flow",
	description:
		"Platform transaction webhook, payment gateway callbacks, and audit event logs.",
};

export default function TransactionEventsPage() {
	return <AdminEventsPage />;
}
