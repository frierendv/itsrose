import type { FaqItem } from "../../types";

export const FAQ_ITEMS: FaqItem[] = [
	{
		id: "billing-cycle",
		title: "How does the subscription billing cycle work?",
		content:
			"Subscriptions are billed automatically on a recurring monthly or annual basis starting from the moment you subscribe. Your payment method will be charged at the start of each billing cycle, and your premium features will renew immediately.",
	},
	{
		id: "cancellation",
		title: "Can I cancel my subscription anytime?",
		content:
			"Yes, you can cancel your subscription at any time without penalty or cancellation fees. Upon cancellation, you will maintain full access to all paid features until the end of your current billing period. No further charges will occur.",
	},
	{
		id: "invoices-receipts",
		title: "How do I download VAT invoices and official receipts?",
		content:
			"All invoice receipts and tax breakdowns are available via your Creem Customer Portal. You can click 'Customer Portal' at the top of this page to view past invoices, download PDF receipts, and update your company VAT/Tax identification number.",
	},
	{
		id: "payment-methods",
		title: "What payment methods are supported?",
		content:
			"We support all major international credit and debit cards (Visa, Mastercard, American Express, Discover, UnionPay) along with modern digital wallets including Apple Pay and Google Pay through secure Creem checkout.",
	},
	{
		id: "failed-payments",
		title: "What happens if an automatic payment fails?",
		content:
			"If a recurring payment fails, our billing system will automatically retry the transaction over several days and notify you by email. You will have a grace period to update your payment method in the Customer Portal before access is suspended.",
	},
	{
		id: "sync-delay",
		title: "I just subscribed or upgraded, but my account hasn't updated yet. What should I do?",
		content:
			"Creem webhook synchronization typically completes within seconds. If your subscription status does not reflect immediately, click the 'Refresh' button in the top right, or re-authenticate (log out and back in) to refresh your active session tokens.",
	},
];
