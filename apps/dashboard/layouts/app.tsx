"use client";

import { useActivePath } from "@/hooks/use-active-path";
import { SidebarInset, SidebarProvider } from "@itsrose/react/sidebar";
import type { PropsWithChildren } from "react";
import { AppContent } from "./app-content";
import { AppNavbar } from "./navbar";
import { AppSidebar } from "./sidebar";

export const AppLayout: React.FC<PropsWithChildren> = ({ children }) => {
	const { pathname } = useActivePath();

	return (
		<SidebarProvider pathname={pathname}>
			<AppSidebar collapsible="icon" side="left" />
			<SidebarInset>
				<AppNavbar />
				<AppContent>{children}</AppContent>
			</SidebarInset>
		</SidebarProvider>
	);
};

AppLayout.displayName = "AppLayout";
