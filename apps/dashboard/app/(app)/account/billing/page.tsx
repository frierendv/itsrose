import { BillingPage } from "@/features/billing";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
	title: "Billing & Subscription",
	description:
		"Manage your active subscription plan, payment methods, billing schedule, and invoices.",
};

export default function Billing() {
	return (
		<Suspense fallback={null}>
			<BillingPage />
		</Suspense>
	);
}
