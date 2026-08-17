"use client";

import {
	SidebarGroup,
	SidebarGroupLabel,
	SidebarMenu,
} from "@/components/ui/sidebar";
import { NavMainItem } from "./nav-main-item";
import type { NavMainProps } from "./types";

export const NavMain = ({ items, label }: NavMainProps) => (
	<SidebarGroup>
		{label && <SidebarGroupLabel>{label}</SidebarGroupLabel>}
		<SidebarMenu>
			{items.map((item) => (
				<NavMainItem key={item.title} item={item} />
			))}
		</SidebarMenu>
	</SidebarGroup>
);
