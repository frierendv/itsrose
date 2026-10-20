import type { Metadata } from "next";

export const generateMetadata = async (): Promise<Metadata> => {
	return {
		title: "Invoices & Receipts - Billing",
		description:
			"Review your account transaction history, complete pending payments, and download official billing invoices.",
	};
};
