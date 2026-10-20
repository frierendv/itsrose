import type { Metadata } from "next";

export const generateMetadata = async (): Promise<Metadata> => {
	return {
		title: "Billing & Subscription",
		description:
			"Manage your active subscription plan, payment methods, billing schedule, and invoices.",
	};
};
