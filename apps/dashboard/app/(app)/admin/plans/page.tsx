import { AdminPlansPage } from "@/features/admin";
import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Admin Plans",
	description: "Manage subscription plans, pricing tiers, and quota limits.",
};

export default function PlansPage() {
	return <AdminPlansPage />;
}
