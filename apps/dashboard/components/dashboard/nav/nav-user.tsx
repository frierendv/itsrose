"use client";

import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/shared/utils";
import { UserButton } from "@better-auth-ui/heroui";

export const NavUser = () => {
	const { state, isMobile } = useSidebar();
	return (
		<UserButton
			className={cn("rounded-xs", {
				"w-full": state !== "collapsed",
			})}
			placement={state === "collapsed" ? "bottom end" : "top"}
			size={state === "collapsed" && !isMobile ? "icon" : "default"}
		/>
	);
};
