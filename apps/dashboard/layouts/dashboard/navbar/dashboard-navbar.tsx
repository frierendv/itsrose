"use client";

import { FlowerOutline, PathBreadcrumbs } from "@/components/common";
import { ThemeSwitchBase } from "@/components/theme-switch";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { config } from "@/config";
import { UserButton } from "@better-auth-ui/heroui";
import { Navbar } from "@itsrose/react";
import { memo } from "react";

export type DashboardNavbarProps = {
	/** Additional CSS class names for navbar */
	className?: string;
};

export const DashboardNavbar = memo<DashboardNavbarProps>(({ className }) => (
	<Navbar position="sticky" maxWidth="full" isBordered className={className}>
		<Navbar.Content justify="start" className=" sm:hidden">
			<Navbar.Item className=" sm:hidden">
				<SidebarTrigger />
			</Navbar.Item>
			<Navbar.Item className=" sm:hidden">
				<Navbar.Brand className="flex items-center gap-1.5 font-bold text-lg">
					<FlowerOutline size={24} />
					<span>{config.APP_NAME}</span>
				</Navbar.Brand>
			</Navbar.Item>
		</Navbar.Content>
		<Navbar.Content justify="start" className="hidden sm:flex">
			<Navbar.Item>
				<PathBreadcrumbs />
			</Navbar.Item>
		</Navbar.Content>

		<Navbar.Content justify="end" className="gap-4">
			<Navbar.Item>
				<ThemeSwitchBase size="sm" variant="ghost" />
			</Navbar.Item>
			<Navbar.Item>
				<UserButton size="icon" />
			</Navbar.Item>
		</Navbar.Content>
	</Navbar>
));

DashboardNavbar.displayName = "DashboardNavbar";
