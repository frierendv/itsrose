import { Gear, House } from "@gravity-ui/icons";
import type { MainItem } from "./nav";

export const NAV_MAIN_ITEMS = [
	{
		title: "Dashboard",
		url: "/",
		icon: House,
		isActive: true,
	},
	{
		title: "Settings",
		url: "/settings",
		icon: Gear,
		items: [
			{
				title: "Account",
				url: "/settings/account",
			},
			{
				title: "Security",
				url: "/settings/security",
			},
			{
				title: "Billing",
				url: "#",
			},
			{
				title: "Limits",
				url: "#",
			},
		],
	},
] as MainItem[];
