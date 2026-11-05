"use client";

import { useDashboardRoute } from "@/hooks/use-dashboard-route";
import LayoutSideContentLeft from "@gravity-ui/icons/LayoutSideContentLeft";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarRail,
	SidebarTrigger,
	type SidebarProps,
} from "@itsrose/react/sidebar";
import { memo } from "react";
import { SidebarBrand } from "./sidebar-brand";
import { SidebarNav } from "./sidebar-nav";
import { SidebarSkeleton } from "./sidebar-skeleton";

export type AppSidebarProps = SidebarProps;

export const AppSidebar = memo<AppSidebarProps>((props) => {
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
						<SidebarSkeleton count={2} showSubItems />
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

AppSidebar.displayName = "AppSidebar";
