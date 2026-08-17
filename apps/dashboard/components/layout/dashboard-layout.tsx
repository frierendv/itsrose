"use client";

import { Content, ErrorBoundary, PathBreadcrumbs } from "@/components/common";
import { DashboardSidebar } from "@/components/dashboard";
import { ThemeSwitchBase } from "@/components/theme-switch";
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "@/components/ui/sidebar";
import { WebSettings } from "@/components/web-settings";
import { memo, type PropsWithChildren } from "react";

export const DashboardLayout = memo<PropsWithChildren>(({ children }) => {
	return (
		<SidebarProvider>
			<DashboardSidebar variant="inset" collapsible="icon" />
			<SidebarInset>
				<header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-md transition-[width,height] ease-linear">
					<div className="flex items-center gap-3">
						<SidebarTrigger />
						<PathBreadcrumbs />
					</div>
					<ThemeSwitchBase />
				</header>
				<Content className="flex-1 gap-4 md:p-4 pt-6">
					<ErrorBoundary>{children}</ErrorBoundary>
				</Content>
			</SidebarInset>
			<WebSettings />
		</SidebarProvider>
	);
});
