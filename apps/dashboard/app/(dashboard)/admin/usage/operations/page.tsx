import { AdminOperationsPage } from "@/features/admin";
import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Admin Metering Operations",
	description: "Manual ledger flush, tenant backfill and billing cron jobs.",
};

export default function UsageOperationsPage() {
	return <AdminOperationsPage />;
}
