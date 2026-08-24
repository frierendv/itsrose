"use client";

import {
	SidebarGroup,
	SidebarGroupLabel,
	SidebarMenu,
} from "@/components/ui/sidebar";
import type { SidebarMainProps } from "@/shared/dashboard";
import { memo } from "react";
import { SidebarNavItem } from "./sidebar-nav-item";

export type SidebarNavProps = SidebarMainProps & {
	className?: string;
};

export const SidebarNav = memo<SidebarNavProps>(
	({ items, label, className }) => (
		<SidebarGroup className={className}>
			{label && <SidebarGroupLabel>{label}</SidebarGroupLabel>}
			<SidebarMenu className="gap-2.5">
				{items.map((item) => (
					<SidebarNavItem key={item.title} item={item} />
				))}
			</SidebarMenu>
		</SidebarGroup>
	)
);

SidebarNav.displayName = "SidebarNav";
