"use client";

import { cn, forwardRef } from "@itsrose/react/core";
import { useNavbarContext } from "./context";

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
		const { isMenuOpen } = useNavbarContext();
		return (
			<Component
				ref={ref}
				className={cn("navbar--menu-item", className)}
				data-active={isActive}
				data-menu-open={isMenuOpen}
				{...otherProps}
			>
				{children}
			</Component>
		);
	}
);
