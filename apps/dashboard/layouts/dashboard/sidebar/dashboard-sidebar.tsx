"use client";

import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarRail,
	SidebarTrigger,
	type SidebarProps,
} from "@/components/ui/sidebar";
import { useDashboardRoute } from "@/hooks/use-dashboard-route";
import LayoutSideContentLeft from "@gravity-ui/icons/LayoutSideContentLeft";
import { memo } from "react";
import { SidebarBrand } from "./sidebar-brand";
import { SidebarNav } from "./sidebar-nav";
import { SidebarSkeleton } from "./sidebar-skeleton";

export type DashboardSidebarProps = SidebarProps & {};

export const DashboardSidebar = memo<DashboardSidebarProps>((props) => {
	const { isPending, data } = useDashboardRoute();

	return (
		<Sidebar {...props}>
			<SidebarHeader>
				<SidebarBrand />
			</SidebarHeader>

			<SidebarContent>
				{!isPending && data ? (
					<>
						<SidebarNav
							items={data?.sidebarMainItems}
							label="Main"
						/>
						<SidebarNav
							items={data?.sidebarSecondaryItems}
							label="Others"
						/>
					</>
				) : (
					<>
						<SidebarSkeleton count={3} />
						<SidebarSkeleton count={3} />
					</>
				)}
			</SidebarContent>

			<SidebarFooter>
				<SidebarTrigger
					size="md"
					className="w-full"
					icon={<LayoutSideContentLeft />}
				>
					Collapse menu
				</SidebarTrigger>
			</SidebarFooter>

			<SidebarRail />
		</Sidebar>
	);
});

DashboardSidebar.displayName = "DashboardSidebar";
