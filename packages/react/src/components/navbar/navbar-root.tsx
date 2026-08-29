"use client";

import { cn, forwardRef } from "@itsrose/react/core";
import { NavbarContextProvider } from "./context";
import { useNavbar, type UseNavbarProps } from "./use-navbar";

export type NavbarRootProps = UseNavbarProps & {
	maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
	position?: "static" | "sticky" | "fixed";
};

export const NavbarRoot = forwardRef<"nav", NavbarRootProps>((props, ref) => {
	const {
		position = "sticky",
		maxWidth = "xl",
		as: Component = "nav",
		className,
		children,
		// context props
		height = "4rem",
		isMenuOpen,
		isMenuDefaultOpen,
		isBordered,
		isBlured,
		onMenuOpenChange,
		// ---
		...otherProps
	} = props;
	const contextValue = useNavbar({
		height,
		isMenuOpen,
		isMenuDefaultOpen,
		isBordered,
		isBlured,
		onMenuOpenChange,
	});

	return (
		<NavbarContextProvider value={contextValue}>
			<Component
				ref={ref}
				className={cn(
					// base style
					"navbar",
					// ---- styled
					{
						"navbar--blur": isBlured,
						"navbar--border": isBordered,
					},
					// postion
					`navbar--${position}`,

					className
				)}
				data-menu-open={contextValue.isMenuOpen}
				{...otherProps}
			>
				<header
					className={cn(
						"navbar--header",
						`navbar--header-${maxWidth}`
					)}
				>
					{children}
				</header>
			</Component>
		</NavbarContextProvider>
	);
});
NavbarRoot.displayName = "NavbarRoot";
