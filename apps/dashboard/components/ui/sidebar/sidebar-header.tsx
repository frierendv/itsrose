import { cn, forwardRef } from "@itsrose/react/core";

export const SidebarHeader = forwardRef<"div">(
	({ as: Component = "div", className, ...props }, ref) => {
		return (
			<Component
				ref={ref}
				data-sidebar="header"
				data-slot="sidebar-header"
				className={cn(
					"sidebar__header flex flex-col gap-2 py-4 shrink-0",
					"group-data-[collapsible=icon]:items-center",
					className
				)}
				{...props}
			/>
		);
	}
);
SidebarHeader.displayName = "SidebarHeader";
