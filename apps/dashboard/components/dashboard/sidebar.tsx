"use client";

import { Logo } from "@/components/common";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarRail,
	SidebarSeparator,
	type SidebarProps,
} from "@/components/ui/sidebar";
import { NAV_MAIN_ITEMS } from "./constants";
import { NavMain, NavUser } from "./nav";

export const DashboardSidebar = (props: SidebarProps) => (
	<Sidebar {...props}>
		<SidebarHeader>
			<div className="flex items-center gap-3 px-0 py-1 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
				<div className="flex size-6 shrink-0 items-center justify-center rounded-md font-bold text-sm shadow-xs select-none">
					<Logo />
				</div>
				<span
					className="text-foreground text-md font-semibold truncate group-data-[collapsible=icon]:hidden select-none"
					data-sidebar="label"
				>
					ItsRose Platform
				</span>
			</div>
		</SidebarHeader>

		<SidebarSeparator />

		<SidebarContent>
			<NavMain items={NAV_MAIN_ITEMS} />
		</SidebarContent>

		<SidebarSeparator />

		<SidebarFooter>
			<NavUser />
		</SidebarFooter>

		<SidebarRail />
	</Sidebar>
);
