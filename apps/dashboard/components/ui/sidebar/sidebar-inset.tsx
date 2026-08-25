import { cn, forwardRef } from "@/shared/utils";
import { surfaceVariants } from "@heroui/react/surface";

export const SidebarInset = forwardRef<"main">(
	({ as: Component = "main", className, ...props }, ref) => {
		return (
			<Component
				ref={ref}
				data-slot="sidebar-main"
				data-scrollbar="thin"
				className={cn(
					surfaceVariants({ variant: "transparent" }),
					"sidebar__main relative flex min-h-svh flex-1 flex-col bg-background",
					"peer-data-[variant=inset]:min-h-[calc(100svh-1rem)]",
					"md:peer-data-[variant=inset]:m-2 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:rounded-2xl",
					// "md:peer-data-[variant=inset]:bg-surface md:peer-data-[variant=inset]:text-surface-foreground",
					"md:peer-data-[varwiant=inset]:border md:peer-data-[variant=inset]:border-border md:peer-data-[variant=inset]:shadow-xs",
					// "transition-all duration-200 ease-linear overflow-x-clip",
					"overflow-x-clip",
					className
				)}
				{...props}
			/>
		);
	}
);
SidebarInset.displayName = "SidebarInset";
