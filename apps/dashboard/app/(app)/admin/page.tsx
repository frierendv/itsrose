import { AdminOverviewPage } from "@/features/admin";
import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Admin Overview",
	description: "Platform administration overview and financial summary.",
};

export default function AdminPage() {
	return <AdminOverviewPage />;
}
