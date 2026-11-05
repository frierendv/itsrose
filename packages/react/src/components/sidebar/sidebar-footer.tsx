import { cn, forwardRef } from "@itsrose/react/core";

export const SidebarFooter = forwardRef<"div">(
	({ as: Component = "div", className, ...props }, ref) => {
		return (
			<Component
				ref={ref}
				data-sidebar="footer"
				data-slot="sidebar-footer"
				className={cn(
					"sidebar__footer flex flex-col gap-1 p-2 shrink-0 mt-auto group-data-[collapsible=icon]:p-1.5 group-data-[collapsible=icon]:items-center",
					className
				)}
				{...props}
			/>
		);
	}
);
SidebarFooter.displayName = "SidebarFooter";
