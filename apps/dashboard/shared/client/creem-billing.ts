import {
	createCreemBillingAdapter,
	type BillingPlan,
} from "@better-auth-ui/core/plugins/billing";
import { DASHBOARD_ROOT_PATH } from "../dashboard";
import { mergePath } from "../utils";
import { authClient } from "./auth-client";

const plans = [
	{
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
	},
	{
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
			{
				id: "hobby-year",
				amount: 2990,
				currency: "EUR",
				interval: "year",
			},
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
	},
	{
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
			{
				id: "pro-year",
				amount: 7990,
				currency: "EUR",
				interval: "year",
			},
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
	},
	{
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
			{
				id: "business-year",
				amount: 19990,
				currency: "EUR",
				interval: "year",
			},
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
	},
] satisfies BillingPlan[];

export const creemBillingAdapter = createCreemBillingAdapter(
	// @ts-expect-error casting correct type instead of any
	authClient,
	{
		plans,
		products: {
			hobby: "",
			pro: "prod_zZYtP5N9NmdJtcPSGXBdY",
			business: "",
			"hobby-month": "hobby-month",
			"hobby-year": "hobby-year",
			"pro-month": "prod_zZYtP5N9NmdJtcPSGXBdY",
			"pro-year": "pro-year",
			"business-month": "business-month",
			"business-year": "business-year",
		},
		successUrl: mergePath(
			DASHBOARD_ROOT_PATH,
			"/settings/billing?checkout=success"
		),
		cancelUrl: mergePath(
			DASHBOARD_ROOT_PATH,
			"/settings/billing?checkout=canceled"
		),
		returnUrl: mergePath(DASHBOARD_ROOT_PATH, "/settings/billing"),
	}
);
