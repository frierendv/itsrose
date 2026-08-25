import {
	AbbrApi,
	FolderTree,
	Gear,
	House,
	PersonGear,
	Persons,
	Shield,
	ShieldExclamation,
	Wallet,
} from "@gravity-ui/icons";
import { mergePath } from "../utils";
import { DASHBOARD_ROOT_PATH } from "./constants";
import type { SidebarItem } from "./types";

export const DEFAULT_SIDEBAR_ITEMS = {
	title: "Home",
	url: DASHBOARD_ROOT_PATH,
	icon: House,
} satisfies SidebarItem;

export const USER_SETTINGS_SIDEBAR_ITEMS = {
	title: "Settings",
	url: mergePath(DASHBOARD_ROOT_PATH, "/settings"),
	icon: Gear,
	items: [
		{
			title: "Account",
			url: mergePath(DASHBOARD_ROOT_PATH, "/settings/account"),
			icon: PersonGear,
		},
		{
			title: "Security",
			url: mergePath(DASHBOARD_ROOT_PATH, "/settings/security"),
			icon: ShieldExclamation,
		},
		{
			title: "Billing",
			url: mergePath(DASHBOARD_ROOT_PATH, "/settings/billing"),
			icon: Wallet,
		},
	],
} satisfies SidebarItem;

export const EXTERNAL_RESOURCE = {
	title: "Resources",
	url: "/resource",
	icon: FolderTree,
	items: [
		{
			title: "Reference",
			url: mergePath("/resource", "/api-reference"),
			isExternal: true,
			icon: AbbrApi,
		},
	],
} satisfies SidebarItem;

export const ADMIN_SIDEBAR_ITEMS = {
	title: "Administrator",
	url: mergePath(DASHBOARD_ROOT_PATH, "/admin"),
	icon: Shield,
	items: [
		{
			title: "Users",
			url: mergePath(DASHBOARD_ROOT_PATH, "/admin/users"),
			icon: Persons,
		},
	],
} satisfies SidebarItem;
