"use client";

import { useSidebar } from "@/components/ui/sidebar";
import { UserButton } from "@better-auth-ui/heroui";
import { cn } from "@itsrose/react/core";
import { memo } from "react";

export type SidebarNavUserProps = {
	className?: string;
};

export const SidebarNavUser = memo<SidebarNavUserProps>(({ className }) => {
	const { state, isMobile } = useSidebar();
	const isCollapsedIcon = state === "collapsed" && !isMobile;

	return (
		<UserButton
			className={cn(
				"rounded-xs",
				{
					"w-full": state !== "collapsed",
				},
				className
			)}
			placement={isCollapsedIcon ? "bottom end" : "top"}
			size={isCollapsedIcon ? "icon" : "default"}
		/>
	);
});

SidebarNavUser.displayName = "SidebarNavUser";
