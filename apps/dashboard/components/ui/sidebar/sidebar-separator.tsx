import { Separator } from "@heroui/react/separator";
import { cn, forwardRef } from "@itsrose/react/core";
import * as React from "react";

export const SidebarSeparator = forwardRef<
	"hr",
	React.ComponentProps<typeof Separator>
>(({ className, ...props }, ref) => {
	return (
		<Separator
			ref={ref as any}
			data-sidebar="separator"
			className={cn("mx-2 w-auto", className)}
			{...props}
		/>
	);
});
SidebarSeparator.displayName = "SidebarSeparator";
