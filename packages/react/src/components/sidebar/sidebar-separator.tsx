import { Separator, type SeparatorProps } from "@heroui/react/separator";
import { cn } from "@itsrose/react/core";
import * as React from "react";

export const SidebarSeparator = React.forwardRef<HTMLElement, SeparatorProps>(
	({ className, ...props }, ref) => {
		return (
			<Separator
				ref={ref}
				data-sidebar="separator"
				className={cn("mx-2 w-auto", className)}
				{...props}
			/>
		);
	}
);
SidebarSeparator.displayName = "SidebarSeparator";
