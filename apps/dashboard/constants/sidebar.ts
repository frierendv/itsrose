import type { SidebarItem } from "@/types/sidebar";
import {
	Archive,
	Camera,
	CreditCard,
	FileDollar,
	FolderTree,
	Gear,
	House,
	LayersVertical,
	Microphone,
	PersonGear,
	Persons,
	Sack,
	Shield,
	ShieldExclamation,
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

// Dashboard service features
export const USER_FEATURES_IMAGE = {
	title: "AI Vision & Image",
	url: "/ai-image-vision",
	icon: Camera,
} satisfies SidebarItem;

export const USER_FEATURES_NEURAL_VOICE = {
	title: "AI Voice Generator",
	url: "/ai-voice",
	icon: Microphone,
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
			title: "Overview",
			url: "/admin",
			icon: Shield,
		},
		{
			title: "Plans",
			url: "/admin/plans",
			icon: LayersVertical,
		},
		{
			title: "Subscriptions",
			url: "/admin/subscriptions",
			icon: CreditCard,
		},
		{
			title: "Transaction",
			url: "/admin/transaction",
			icon: Sack,
			items: [
				{
					title: "Ledger & Invoices",
					url: "/admin/transaction",
					icon: FileDollar,
				},
				{
					title: "Event Flow",
					url: "/admin/transaction/events",
					icon: Vault,
				},
			],
		},
		{
			title: "Users",
			url: "/admin/users",
			icon: Persons,
		},
	],
} satisfies SidebarItem;
