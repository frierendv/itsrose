import { cn, forwardRef } from "@/shared/utils";
import { Button } from "@heroui/react";

export const SidebarGroup = forwardRef<"div">(
	({ as: Component = "div", className, ...props }, ref) => {
		return (
			<Component
				ref={ref}
				data-sidebar="group"
				className={cn(
					"relative flex w-full min-w-0 flex-col p-2 group-data-[collapsible=icon]:p-0",
					className
				)}
				{...props}
			/>
		);
	}
);
SidebarGroup.displayName = "SidebarGroup";

export const SidebarGroupLabel = forwardRef<"div">(
	({ as: Component = "div", className, ...props }, ref) => {
		return (
			<Component
				ref={ref}
				data-sidebar="group-label"
				className={cn(
					"duration-200 flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-semibold uppercase tracking-wider text-muted outline-none transition-[margin,opacity] ease-linear",
					"group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:pointer-events-none group-data-[collapsible=icon]:-mt-8",
					className
				)}
				{...props}
			/>
		);
	}
);
SidebarGroupLabel.displayName = "SidebarGroupLabel";

export const SidebarGroupAction = forwardRef<
	"button",
	React.ComponentProps<typeof Button>
>(({ className, ...props }, ref) => {
	return (
		<Button
			ref={ref}
			data-sidebar="group-action"
			variant="ghost"
			isIconOnly
			size="sm"
			className={cn(
				"absolute right-3 top-3.5 size-5 min-w-0 p-0",
				"group-data-[collapsible=icon]:hidden",
				"[&>svg]:size-3.5 [&>svg]:shrink-0",
				className
			)}
			{...props}
		/>
	);
});
SidebarGroupAction.displayName = "SidebarGroupAction";

export const SidebarGroupContent = forwardRef<"div">(
	({ as: Component = "div", className, ...props }, ref) => {
		return (
			<Component
				ref={ref}
				data-sidebar="group-content"
				className={cn("w-full text-sm", className)}
				{...props}
			/>
		);
	}
);
SidebarGroupContent.displayName = "SidebarGroupContent";
