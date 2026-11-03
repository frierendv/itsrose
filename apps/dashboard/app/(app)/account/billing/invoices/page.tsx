import { InvoicesPage } from "@/features/billing";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
	title: "Invoices & Receipts - Billing",
	description:
		"Review your account transaction history, complete pending payments, and download official billing invoices.",
};

export default function Invoices() {
	return (
		<Suspense fallback={null}>
			<InvoicesPage />
		</Suspense>
	);
}
