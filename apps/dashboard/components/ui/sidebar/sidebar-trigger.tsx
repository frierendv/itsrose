import Bars from "@gravity-ui/icons/Bars";
import { Button, Tooltip } from "@heroui/react";
import { forwardRef } from "@itsrose/react/core";
import { useSidebar } from "./context";

export type SidebarTriggerProps = Omit<
	React.ComponentProps<typeof Button>,
	"children"
> & {
	/** Icon */
	icon?: React.ReactNode;
};

export const SidebarTrigger = forwardRef<"button", SidebarTriggerProps>(
	(props, ref) => {
		const { children, icon, ...restProps } = props;
		const { toggleSidebar, state } = useSidebar();

		const renderIcon = icon ? icon : <Bars />;
		const renderChildren = state !== "collapsed" && children;

		return (
			<Tooltip delay={300}>
				<Button
					ref={ref}
					data-slot="sidebar-trigger"
					data-sidebar="trigger"
					variant="ghost"
					isIconOnly={state === "collapsed" || !children}
					size="sm"
					onPress={() => toggleSidebar()}
					{...restProps}
				>
					{renderIcon}
					{renderChildren}
					<span className="sr-only">Toggle Sidebar</span>
				</Button>
				<Tooltip.Content placement="bottom">
					<Tooltip.Arrow />
					Toggle Sidebar (⌘B)
				</Tooltip.Content>
			</Tooltip>
		);
	}
);
SidebarTrigger.displayName = "SidebarTrigger";
