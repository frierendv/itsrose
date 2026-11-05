"use client";

import { useActivePath } from "@/hooks/use-active-path";
import { SidebarInset, SidebarProvider } from "@itsrose/react/sidebar";
import type { PropsWithChildren } from "react";
import { AppNavbar } from "./navbar";
import { AppSidebar } from "./sidebar";

export const AppLayout: React.FC<PropsWithChildren> = ({ children }) => {
	const { pathname } = useActivePath();

	return (
		<SidebarProvider pathname={pathname}>
			<AppSidebar collapsible="icon" side="left" />
			<SidebarInset>
				<AppNavbar />
				<div
					className="flex flex-col gap-4 p-2 px-2 md:p-4 md:px-6 md:gap-6 lg:gap-8"
					data-layout="app"
				>
					{children}
				</div>
			</SidebarInset>
		</SidebarProvider>
	);
};

AppLayout.displayName = "AppLayout";
