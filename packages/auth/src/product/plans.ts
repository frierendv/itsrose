import type { BillingPlan } from "./types";

export const FREE_PLAN = {
	id: "free",
	name: "Free Plan",
	description: "Get started with the API at no cost.",
	prices: [],
	features: [
		"10 API Requests per Minute (RPM)",
		"24-Hour Request Logs",
		"Basic Analytics",
		"Community Support",
	],
	highlighted: false,
	seatBased: false,
} satisfies BillingPlan;
export const HOBBY_PLAN = {
	id: "hobby",
	name: "Hobby Plan",
	description: "For personal projects and small applications.",
	prices: [
		{
			id: "hobby-month",
			amount: 299,
			currency: "EUR",
			interval: "month",
		},
		// {
		// 	id: "hobby-year",
		// 	amount: 2990,
		// 	currency: "EUR",
		// 	interval: "year",
		// },
	],
	features: [
		"60 API Requests per Minute (RPM)",
		"7-Day Request Logs",
		"Basic Analytics",
		"Webhooks",
		"Email Support",
	],
	highlighted: false,
	seatBased: false,
} satisfies BillingPlan;
export const PRO_PLAN = {
	id: "pro",
	name: "Pro Plan",
	description: "For production applications and growing projects.",
	prices: [
		{
			id: "pro-month",
			amount: 799,
			currency: "EUR",
			interval: "month",
		},
		// {
		// 	id: "pro-year",
		// 	amount: 7990,
		// 	currency: "EUR",
		// 	interval: "year",
		// },
	],
	features: [
		"300 API Requests per Minute (RPM)",
		"30-Day Request Logs",
		"Advanced Analytics",
		"Webhooks",
		"Priority Support",
	],
	highlighted: true,
	seatBased: false,
} satisfies BillingPlan;
export const BUSINESS_PLAN = {
	id: "business",
	name: "Business Plan",
	description: "For high-volume applications and growing businesses.",
	prices: [
		{
			id: "business-month",
			amount: 1999,
			currency: "EUR",
			interval: "month",
		},
		// {
		// 	id: "business-year",
		// 	amount: 19990,
		// 	currency: "EUR",
		// 	interval: "year",
		// },
	],
	features: [
		"1K API Requests per Minute (RPM)",
		"90-Day Request Logs",
		"Advanced Analytics",
		"Webhooks",
		"Priority Support",
	],
	highlighted: false,
	seatBased: false,
} satisfies BillingPlan;

export const BILLING_PLANS = [FREE_PLAN, HOBBY_PLAN, PRO_PLAN, BUSINESS_PLAN];
