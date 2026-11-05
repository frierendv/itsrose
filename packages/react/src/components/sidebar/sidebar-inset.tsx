import { cn, forwardRef } from "@itsrose/react/core";

export const SidebarInset = forwardRef<"main">(
	({ as: Component = "main", className, ...props }, ref) => {
		return (
			<Component
				ref={ref}
				data-slot="sidebar-main"
				data-scrollbar="thin"
				className={cn(
					"sidebar__main relative flex min-h-svh flex-1 flex-col bg-background",
					"peer-data-[variant=inset]:min-h-[calc(100svh-1rem)]",
					"md:peer-data-[variant=inset]:m-2 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:rounded-(--field-radius)",
					"md:peer-data-[variant=inset]:border md:peer-data-[variant=inset]:border-border md:peer-data-[variant=inset]:shadow-xs",
					"overflow-x-clip",
					className
				)}
				{...props}
			/>
		);
	}
);
SidebarInset.displayName = "SidebarInset";
