"use client";

import type { SidebarItemProps } from "@/types/sidebar";
import {
	SidebarGroup,
	SidebarGroupLabel,
	SidebarMenu,
} from "@itsrose/react/sidebar";
import { SidebarNavItem } from "./sidebar-nav-item";

export type SidebarNavProps = SidebarItemProps & {
	className?: string;
};

export const SidebarNav: React.FC<SidebarNavProps> = ({
	items,
	label,
	className,
}) => (
	<SidebarGroup className={className}>
		{label && <SidebarGroupLabel>{label}</SidebarGroupLabel>}
		<SidebarMenu className="gap-1.5">
			{items.map((item) => (
				<SidebarNavItem key={item.url + item.title} item={item} />
			))}
		</SidebarMenu>
	</SidebarGroup>
);

SidebarNav.displayName = "SidebarNav";
