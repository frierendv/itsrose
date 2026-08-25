import { Button, Tooltip } from "@heroui/react";
import { cn, forwardRef } from "@itsrose/react/core";
import { useSidebar } from "./context";

export const SidebarTrigger = forwardRef<
	"button",
	React.ComponentProps<typeof Button>
>(({ className, onClick, ...props }, ref) => {
	const { toggleSidebar } = useSidebar();

	return (
		<Tooltip delay={300}>
			<Button
				ref={ref}
				data-slot="sidebar-trigger"
				data-sidebar="trigger"
				variant="ghost"
				isIconOnly
				size="sm"
				className={cn("h-8 w-8", className)}
				onPress={() => toggleSidebar()}
				{...props}
			>
				<svg
					fill="none"
					height="16"
					viewBox="0 0 16 16"
					width="16"
					xmlns="http://www.w3.org/2000/svg"
					className="size-4"
				>
					<path
						clipRule="evenodd"
						d="M6 3.5h6A1.5 1.5 0 0 1 13.5 5v6a1.5 1.5 0 0 1-1.5 1.5H6zm-1.5 0H4A1.5 1.5 0 0 0 2.5 5v6A1.5 1.5 0 0 0 4 12.5h.5zM1 5a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3H4a3 3 0 0 1-3-3z"
						fill="currentColor"
						fillRule="evenodd"
					/>
				</svg>
				<span className="sr-only">Toggle Sidebar</span>
			</Button>
			<Tooltip.Content placement="bottom">
				<Tooltip.Arrow />
				Toggle Sidebar (⌘B)
			</Tooltip.Content>
		</Tooltip>
	);
});
SidebarTrigger.displayName = "SidebarTrigger";
