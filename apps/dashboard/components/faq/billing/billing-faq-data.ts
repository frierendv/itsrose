import type { FaqItem } from "@/types";

export interface BillingFaqItem extends FaqItem {
	badge: string;
	summary: string;
	iconName:
		| "QrCode"
		| "Clock"
		| "ArrowUpRight"
		| "SlidersVertical"
		| "ArrowsRotateLeft"
		| "ShieldCheck"
		| "Receipt"
		| "CreditCard";
}

export interface BillingKeyPoint {
	title: string;
	description: string;
	iconName: "QrCode" | "CreditCard" | "Clock" | "ShieldCheck";
}

export const BILLING_KEY_POINTS: BillingKeyPoint[] = [
	{
		title: "QRIS & National Rails",
		description:
			"Instant settlement via BCA mobile, GoPay, OVO, DANA, LinkAja, and all QRIS apps.",
		iconName: "QrCode",
	},
	{
		title: "Major Bank Virtual Accounts",
		description:
			"Automated 24/7 verification for BCA, Mandiri, BRI, BNI, and Permata Virtual Accounts.",
		iconName: "CreditCard",
	},
	{
		title: "Push-Based Invoicing (D-3)",
		description:
			"Renewal invoices are issued 3 days before period end. Settle manually with zero silent card debits.",
		iconName: "Clock",
	},
	{
		title: "72-Hour Grace Period",
		description:
			"API access stays operational during the 3-day PAST_DUE window before dropping to Free.",
		iconName: "ShieldCheck",
	},
];

export const FAQ_ITEMS: BillingFaqItem[] = [
	{
		id: "payment-methods",
		badge: "QRIS & VA",
		iconName: "QrCode",
		title: "What payment methods can I use?",
		summary:
			"Instant settlement in IDR through QRIS, major Indonesian bank Virtual Accounts, and e-wallets.",
		content:
			"We support standard Indonesian payment rails with instant automated settlement and zero foreign conversion markups:\n\n• **QRIS (Quick Response Code Indonesia Standard):** Compatible with all banking apps (BCA mobile, Livin' by Mandiri, BRImo, BNI Mobile, PermataME) and major digital wallets (GoPay, OVO, DANA, LinkAja, ShopeePay).\n• **Bank Virtual Accounts:** Automated real-time verification for BCA, Mandiri, BRI, BNI, and Permata Virtual Accounts.\n• **e-Wallets:** Direct one-step mobile and web checkout through GoPay and ShopeePay.\n\nAll transactions are billed strictly in Indonesian Rupiah (IDR). Once settled, webhooks trigger instantaneous account provisioning and quota refreshes.",
	},
	{
		id: "recurring-renewals",
		badge: "D-3 Push Model",
		iconName: "Clock",
		title: "How do recurring renewals work?",
		summary:
			"Manual push-based invoice settlement generated 3 days before cycle end—no surprise card auto-debits.",
		content:
			"We utilize a developer-first push settlement model rather than silent credit card auto-debits:\n\n• **D-3 Invoice Generation:** Exactly 3 days before your active 30-day billing cycle concludes, our billing engine generates a renewal invoice and sends you a payment link.\n• **Flexible Settlement:** You have a 3-day advance window to settle the invoice via QRIS or Bank Virtual Account whenever convenient.\n• **Fixed Period Anchor:** Settle early without losing time. Your next 30-day billing cycle is anchored to your existing period end date, ensuring a consistent and predictable renewal cadence.",
	},
	{
		id: "mid-cycle-upgrades",
		badge: "Net Prorated Credit",
		iconName: "ArrowUpRight",
		title: "How does mid-cycle plan upgrading work?",
		summary:
			"Pay only the prorated difference for remaining cycle days; higher rate limits activate immediately.",
		content:
			"Upgrades calculate the exact monetary difference for the remaining duration of your current 30-day billing cycle:\n\n• **Automatic Unused Credit:** Any remaining unused days on your active plan are credited toward your new tier.\n• **Immediate Net Invoice:** You only pay the net prorated difference upfront rather than the full month price.\n• **Instant Feature Unlock:** Upgraded rate limits and expanded quota allowances unlock immediately upon transaction settlement.\n• **Anchored Period End:** Your cycle renewal date remains unchanged, keeping your team's billing schedule streamlined.",
	},
	{
		id: "plan-downgrades",
		badge: "Zero-Cost Scheduled",
		iconName: "SlidersVertical",
		title: "How do plan downgrades work?",
		summary:
			"Scheduled for period end at zero cost; higher-tier features remain active until the period expires.",
		content:
			"Downgrades are zero-cost and scheduled for the end of your active 30-day billing period (`period_end`):\n\n• **Uninterrupted Benefits:** Because we do not issue partial cash refunds, you retain 100% access to your higher-tier rate limits, features, and allowances until your current cycle ends.\n• **Automated Cycle Cutover:** When your current cycle expires, your account transitions smoothly to the requested lower tier.\n• **Lower Subsequent Invoices:** Your upcoming renewal invoice will automatically reflect the lower tier rate.",
	},
	{
		id: "cancel-downgrade",
		badge: "1-Click Revert",
		iconName: "ArrowsRotateLeft",
		title: "Can I cancel a scheduled downgrade?",
		summary:
			"Easily revert a pending downgrade from your billing dashboard at any point before renewal.",
		content:
			"Yes, at any time before your billing cycle concludes:\n\n• **1-Click Cancellation:** Navigate to your Billing overview and click 'Cancel Downgrade' on your active subscription card.\n• **Immediate Restoration:** Your subscription immediately reverts to standard renewal at your current tier with no penalties or service gaps.\n• **Zero Penalties:** You will not be charged any cancellation or reactivation fees.",
	},
	{
		id: "grace-period",
		badge: "72h Safety Window",
		iconName: "ShieldCheck",
		title: "What happens if I forget to pay my renewal invoice on time?",
		summary:
			"Subscriptions enter a 3-day grace period with full service continuity before downgrading to Free.",
		content:
			"To prevent outages in your production environments, past-due renewal invoices trigger an automatic 3-day grace period (`PAST_DUE`):\n\n• **Zero Outages:** Throughout this 72-hour window, all your production API tokens, rate limits, and dashboard capabilities remain 100% operational.\n• **Quick Settlement:** You can pay the pending invoice via QRIS or Virtual Account at any moment during the grace period to immediately restore your account to `active`.\n• **Graceful Free Fallback:** If the invoice remains unpaid after 72 hours, your subscription transitions safely to the Free tier. No overdue penalties or debt collections are ever incurred.",
	},
	{
		id: "invoices-receipts",
		badge: "Real-Time Invoices",
		iconName: "Receipt",
		title: "Where can I see my receipts and payment history?",
		summary:
			"Track all pending and paid invoices, itemized breakdown receipts, and payment links in your dashboard.",
		content:
			"Every transaction order and billing state change is permanently tracked on your dashboard:\n\n• **Invoice History Table:** The Billing overview displays recent invoices with real-time status chips (Paid, Pending, Expired, Void).\n• **Itemized Breakdown:** Navigate to 'All Invoices' to view detailed order IDs, created timestamps, due dates, and exact IDR figures.\n• **Direct Payment Links:** For pending or past-due invoices, click 'Pay' directly inside the table to reopen your QRIS or Virtual Account payment screen.",
	},
	{
		id: "custom-invoicing",
		badge: "Enterprise Invoicing",
		iconName: "CreditCard",
		title: "Do you provide enterprise invoices or corporate tax receipts?",
		summary:
			"Corporate invoices with company legal entity names, NPWP, and manual corporate transfer options.",
		content:
			"Yes! For engineering departments, agencies, and enterprise organizations needing specialized paperwork:\n\n• **Entity & NPWP Details:** Invoices can include your organization's legal company name, NPWP, and registered business address.\n• **Direct Corporate Transfers:** Enterprise teams purchasing annual plans can arrange direct corporate bank transfers and purchase orders (PO).\n• **Billing Support:** Reach out directly to our finance team at support@itsrose.net with your billing requirements.",
	},
];
