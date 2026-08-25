import { cn, forwardRef } from "@/shared/utils";

export const SidebarHeader = forwardRef<"div">(
	({ as: Component = "div", className, ...props }, ref) => {
		return (
			<Component
				ref={ref}
				data-sidebar="header"
				data-slot="sidebar-header"
				className={cn(
					"sidebar__header flex flex-col gap-2 p-3 pb-2 shrink-0 group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:items-center",
					className
				)}
				{...props}
			/>
		);
	}
);
SidebarHeader.displayName = "SidebarHeader";
