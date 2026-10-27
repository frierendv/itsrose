import { cn, forwardRef } from "@itsrose/react/core";

export type NavbarMenuItemProps = {
	isActive?: boolean;
};

export const NavbarMenuItem = forwardRef<"li", NavbarMenuItemProps>(
	(props, ref) => {
		const {
			className,
			isActive,
			children,
			as: Component = "li",
			...otherProps
		} = props;
		return (
			<Component
				ref={ref}
				className={cn("navbar--menu-item", className)}
				data-active={isActive}
				{...otherProps}
			>
				{children}
			</Component>
		);
	}
);
NavbarMenuItem.displayName = "NavbarMenuItem";
