"use client";

import { PathBreadcrumbs } from "@/components/common";
import { ThemeSwitch } from "@/components/theme-switch";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { config } from "@/config";
import { UserButton } from "@better-auth-ui/heroui";
import { BrandIcon } from "@itsrose/react/itsrose";
import { Navbar } from "@itsrose/react/navbar";

export type AppNavbarProps = {
	/** Additional CSS class names for navbar */
	className?: string;
};

export const AppNavbar: React.FC<AppNavbarProps> = ({ className }) => (
	<Navbar position="sticky" maxWidth="full" isBordered className={className}>
		<Navbar.Content justify="start" className=" sm:hidden">
			<Navbar.Item className=" sm:hidden">
				<SidebarTrigger />
			</Navbar.Item>
			<Navbar.Item className=" sm:hidden">
				<Navbar.Brand className="flex items-center gap-1.5 font-bold text-lg">
					<BrandIcon size={24} />
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
				<ThemeSwitch size="sm" variant="ghost" />
			</Navbar.Item>
			<Navbar.Item>
				<UserButton size="icon" />
			</Navbar.Item>
		</Navbar.Content>
	</Navbar>
);

AppNavbar.displayName = "AppNavbar";
