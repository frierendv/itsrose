import { AdminRatesPage } from "@/features/admin";
import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Admin Usage Rates",
	description: "Versioned unit prices for metered API usage.",
};

export default function UsageRatesPage() {
	return <AdminRatesPage />;
}
