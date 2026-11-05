"use client";

import { Skeleton } from "@heroui/react";
import {
	SidebarGroup,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuItem,
	SidebarMenuSkeleton,
	SidebarMenuSub,
} from "@itsrose/react/sidebar";

export type SidebarSkeletonProps = {
	/** Number of main skeleton items to show (default: 3) */
	count?: number;
	showSubItems?: boolean;
};

export const SidebarSkeleton: React.FC<SidebarSkeletonProps> = ({
	count = 3,
	showSubItems = false,
}) => {
	const items = Array.from({ length: count }, (_, i) => i);

	return (
		<SidebarGroup>
			<SidebarGroupLabel>
				<Skeleton className="h-3 w-16 rounded-(--radius)" />
			</SidebarGroupLabel>
			<SidebarMenu className="gap-1.5">
				{items.map((key) => (
					<SidebarMenuItem key={key} level={1}>
						<SidebarMenuSkeleton showIcon />
					</SidebarMenuItem>
				))}
				{showSubItems && (
					<SidebarMenuItem level={1} hasChildItems>
						<SidebarMenuSkeleton showIcon />
						<SidebarMenuSub className="gap-1.5">
							<SidebarMenuItem level={2}>
								<SidebarMenuSkeleton showIcon={false} />
							</SidebarMenuItem>
							<SidebarMenuItem level={2}>
								<SidebarMenuSkeleton showIcon={false} />
							</SidebarMenuItem>
						</SidebarMenuSub>
					</SidebarMenuItem>
				)}
			</SidebarMenu>
		</SidebarGroup>
	);
};

SidebarSkeleton.displayName = "SidebarSkeleton";
