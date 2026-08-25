"use client";

import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarRail,
	type SidebarProps,
} from "@/components/ui/sidebar";
import { useDashboardRoute } from "@/hooks/use-dashboard-route";
import { memo } from "react";
import { SidebarBrand } from "./sidebar-brand";
import { SidebarNav } from "./sidebar-nav";
import { SidebarNavUser } from "./sidebar-nav-user";
import { SidebarSkeleton } from "./sidebar-skeleton";

export type DashboardSidebarProps = SidebarProps & {};

export const DashboardSidebar = memo<DashboardSidebarProps>((props) => {
	const { isPending, data } = useDashboardRoute();

	return (
		<Sidebar {...props}>
			<SidebarBrand />

			<SidebarContent>
				{!isPending && data?.sidebarMainItems ? (
					<SidebarNav items={data?.sidebarMainItems} />
				) : (
					<SidebarSkeleton count={3} />
				)}

				{!isPending && data?.sidebarSecondaryItems ? (
					<SidebarNav items={data?.sidebarSecondaryItems} />
				) : (
					<SidebarSkeleton count={3} />
				)}
			</SidebarContent>

			<SidebarFooter>
				<SidebarNavUser />
			</SidebarFooter>

			<SidebarRail />
		</Sidebar>
	);
});

DashboardSidebar.displayName = "DashboardSidebar";
