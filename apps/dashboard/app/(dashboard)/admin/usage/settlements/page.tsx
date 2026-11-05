import { AdminSettlementsPage } from "@/features/admin";
import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Admin Settlements",
	description: "Periodic settlement of metered API usage.",
};

export default function UsageSettlementsPage() {
	return <AdminSettlementsPage />;
}
