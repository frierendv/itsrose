"use client";

import {
	SidebarGroup,
	SidebarMenu,
	SidebarMenuItem,
	SidebarMenuSkeleton,
} from "@/components/ui/sidebar";
import { memo } from "react";

export type SidebarSkeletonProps = {
	/** Number of skeleton items to show (default: 4) */
	count?: number;
};

export const SidebarSkeleton = memo<SidebarSkeletonProps>(({ count = 4 }) => {
	const items = Array.from({ length: count }, (_, i) => i);

	return (
		<SidebarGroup>
			<SidebarMenu>
				{items.map((key) => (
					<SidebarMenuItem key={key} level={1}>
						<SidebarMenuSkeleton showIcon />
					</SidebarMenuItem>
				))}
			</SidebarMenu>
		</SidebarGroup>
	);
});

SidebarSkeleton.displayName = "SidebarSkeleton";
