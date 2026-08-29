"use client";

import { AuthProvider } from "@/client/providers/auth";
import { Content, ErrorBoundary } from "@/components/common";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { WebSettings } from "@/components/web-settings";
import { memo, type PropsWithChildren } from "react";
import { DashboardNavbar } from "./navbar";
import { DashboardSidebar } from "./sidebar";

export const DashboardLayout = memo<PropsWithChildren>(({ children }) => {
	return (
		<AuthProvider>
			<SidebarProvider>
				<DashboardSidebar collapsible="icon" side="left" />

				<SidebarInset>
					<DashboardNavbar />
					<Content className="p-2 md:p-4 px-2 md:px-6 md:gap-6 lg:gap-8">
						<ErrorBoundary>{children}</ErrorBoundary>
					</Content>
				</SidebarInset>

				<WebSettings />
			</SidebarProvider>
		</AuthProvider>
	);
});

DashboardLayout.displayName = "DashboardLayout";
