import {
	Archive,
	Camera,
	FolderTree,
	Gear,
	House,
	Microphone,
	PersonGear,
	Persons,
	Sack,
	Shield,
	ShieldExclamation,
	Vault,
	Wallet,
} from "@gravity-ui/icons";
import type { ComponentType } from "react";

export type SidebarSubItem = {
	title: string;
	url: `/${string}`;
	isExternal?: boolean;
	icon?: ComponentType<{ className?: string }>;
};

export type SidebarItem = SidebarSubItem & {
	items?: SidebarSubItem[];
};

export type SidebarItemProps = {
	items: SidebarItem[];
	label?: string;
};

/*s

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
	title: "Text to Speech",
	url: "/text-to-speech",
	icon: Microphone,
} satisfies SidebarItem;

export const EXTERNAL_RESOURCE = {
	title: "Resources",
	url: "/resource",
	icon: FolderTree,
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
			title: "Users",
			url: "/admin/users",
			icon: Persons,
		},
		{
			title: "Transaction",
			url: "/admin/transaction",
			icon: Sack,
		},
		{
			title: "Transaction events",
			url: "/admin/transaction/events",
			icon: Vault,
		},
	],
} satisfies SidebarItem;
