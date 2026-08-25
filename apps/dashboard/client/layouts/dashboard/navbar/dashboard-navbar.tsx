"use client";

import { FlowerOutline, PathBreadcrumbs } from "@/components/common";
import { ThemeSwitchBase } from "@/components/theme-switch";
import { Navbar } from "@/components/ui/navbar";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { config } from "@/shared/config";
import { memo } from "react";

export type DashboardNavbarProps = {
	/** Additional CSS class names for navbar */
	className?: string;
};

export const DashboardNavbar = memo<DashboardNavbarProps>(({ className }) => (
	<Navbar position="sticky" maxWidth="full" className={className}>
		<Navbar.Content justify="start">
			<Navbar.Item>
				<SidebarTrigger />
			</Navbar.Item>

			<Navbar.Brand className="flex md:hidden items-center gap-1.5 font-bold text-lg">
				<FlowerOutline size={24} />
				<span>{config.APP_NAME}</span>
			</Navbar.Brand>

			<Navbar.Item className="hidden sm:flex">
				<PathBreadcrumbs />
			</Navbar.Item>
		</Navbar.Content>

		<Navbar.Content justify="end">
			<Navbar.Item>
				<ThemeSwitchBase size="sm" variant="ghost" />
			</Navbar.Item>
		</Navbar.Content>
	</Navbar>
));

DashboardNavbar.displayName = "DashboardNavbar";
