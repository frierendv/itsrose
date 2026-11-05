import { ADMIN_ROUTES } from "@/features/admin/routes";
import type { SidebarItem } from "@/types/sidebar";
import {
	Archive,
	CreditCard,
	FileDollar,
	FolderTree,
	Gear,
	House,
	LayersVertical,
	PersonGear,
	Persons,
	Sack,
	Shield,
	ShieldExclamation,
	Speedometer,
	Vault,
	Wallet,
} from "@gravity-ui/icons";

/*

 ------------- Constants -------------

*/

export const DEFAULT_SIDEBAR_ITEMS = {
	title: "Dashboard",
	url: "/",
	icon: House,
} satisfies SidebarItem;

export const USER_SETTINGS_SIDEBAR_ITEMS = {
	title: "Settings",
	url: "/account",
	icon: Gear,
	items: [
		{
			title: "Account",
			url: "/account",
			icon: PersonGear,
		},
		{
			title: "Security",
			url: "/account/security",
			icon: ShieldExclamation,
		},
		{
			title: "Billing",
			url: "/account/billing",
			icon: Wallet,
			items: [
				{
					title: "Subscription",
					url: "/account/billing",
					icon: CreditCard,
				},
				{
					title: "Invoices",
					url: "/account/billing/invoices",
					icon: FileDollar,
				},
			],
		},
	],
} satisfies SidebarItem;

export const USER_LOGS_SIDEBAR_ITEMS = {
	title: "Logs",
	icon: Archive,
	url: "/logs",
	items: [
		{
			title: "Activity",
			url: "/logs/activity",
		},
	],
} satisfies SidebarItem;

export const EXTERNAL_RESOURCE = {
	title: "Resources",
	url: "/api-reference",
	icon: FolderTree,
	isExternal: true,
	items: [
		{
			title: "API Reference",
			url: "/api-reference",
			isExternal: true,
		},
	],
} satisfies SidebarItem;

export const ADMIN_SIDEBAR_ITEMS = {
	title: "Administrator",
	url: "/admin",
	icon: Shield,
	items: [
		{
			title: "Command Center",
			url: ADMIN_ROUTES.commandCenter,
			icon: Shield,
		},
		{
			title: "Usage",
			url: "/admin/usage",
			icon: Speedometer,
			items: [
				{
					title: "Rates",
					url: ADMIN_ROUTES.usageRates,
					icon: FileDollar,
				},
				{
					title: "Settlements",
					url: ADMIN_ROUTES.usageSettlements,
					icon: Vault,
				},
			],
		},
		{
			title: "Billing",
			url: "/admin/billing",
			icon: CreditCard,
			items: [
				{
					title: "Plans",
					url: ADMIN_ROUTES.billingPlans,
					icon: LayersVertical,
				},
				{
					title: "Subscriptions",
					url: ADMIN_ROUTES.billingSubscriptions,
					icon: CreditCard,
				},
				{
					title: "Invoices",
					url: ADMIN_ROUTES.billingInvoices,
					icon: Sack,
				},
				{
					title: "Events",
					url: ADMIN_ROUTES.billingEvents,
					icon: Vault,
				},
			],
		},
		{
			title: "Access",
			url: "/admin/access",
			icon: Persons,
			items: [
				{
					title: "Users",
					url: ADMIN_ROUTES.accessUsers,
					icon: PersonGear,
				},
			],
		},
	],
} satisfies SidebarItem;
