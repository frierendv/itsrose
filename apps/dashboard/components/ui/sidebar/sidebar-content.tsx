import { ScrollShadow } from "@heroui/react/scroll-shadow";
import { cn, forwardRef } from "@itsrose/react/core";
import * as React from "react";

export const SidebarContent = forwardRef<
	"div",
	React.ComponentProps<typeof ScrollShadow>
>(({ className, children, ...props }, ref) => {
	return (
		<ScrollShadow
			ref={ref as any}
			data-sidebar="content"
			className={cn(
				"flex min-h-0 flex-1 flex-col gap-2 overflow-auto p-2 scrollbar-none",
				className
			)}
			{...props}
		>
			{children}
		</ScrollShadow>
	);
});
SidebarContent.displayName = "SidebarContent";
