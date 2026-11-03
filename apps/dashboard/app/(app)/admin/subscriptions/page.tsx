import { AdminSubscriptionsPage } from "@/features/admin";
import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Admin Subscriptions",
	description: "Platform subscriptions, manual tier overrides, and renewals.",
};

export default function SubscriptionsPage() {
	return <AdminSubscriptionsPage />;
}
