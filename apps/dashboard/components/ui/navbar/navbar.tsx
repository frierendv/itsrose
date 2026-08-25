"use client";

import { cn, forwardRef } from "@itsrose/react/core";
import { NavbarContextProvider } from "./context";
import { useNavbar, type UseNavbarProps } from "./use-navbar";

const MAX_WIDTH_CLASSES = {
	sm: "max-w-[640px]",
	md: "max-w-[768px]",
	lg: "max-w-[1024px]",
	xl: "max-w-[1280px]",
	"2xl": "max-w-[1536px]",
	full: "max-w-full",
} satisfies Record<NonNullable<NavbarProps["maxWidth"]>, string>;

export type NavbarProps = UseNavbarProps & {
	maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
	position?: "static" | "sticky" | "fixed";
};

export const Navbar = forwardRef<"nav", NavbarProps>((props, ref) => {
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
		onMenuOpenChange,
		// ---
		...otherProps
	} = props;
	const contextValue = useNavbar({
		height,
		isMenuOpen,
		isMenuDefaultOpen,
		onMenuOpenChange,
	});

	return (
		<NavbarContextProvider value={contextValue}>
			<Component
				ref={ref}
				className={cn(
					"flex",
					"z-40",
					"w-full",
					"h-auto",
					"items-center",
					"justify-center",
					"data-[menu-open=true]:border-none",

					// blur
					"backdrop-blur-lg",
					"data-[menu-open=true]:backdrop-blur-xl",
					"backdrop-saturate-150",
					"bg-background/70",

					// border
					"border-b divide-y-2",
					position === "sticky" && "sticky top-0 inset-x-0",
					position === "fixed" && "fixed top-0",
					className
				)}
				style={
					{
						"--navbar-height":
							typeof height === "number" ? `${height}px` : height,
					} as React.CSSProperties
				}
				{...otherProps}
			>
				<header
					className={cn(
						"z-40",
						"flex",
						"px-2",
						"md:px-6",
						"gap-4",
						"w-full",
						"flex-row",
						"relative",
						"flex-nowrap",
						"items-center",
						"justify-between",
						"h-(--navbar-height)",
						// "flex h-16 items-center justify-between px-6",
						maxWidth !== "full" && MAX_WIDTH_CLASSES[maxWidth]
						// "mx-auto"
					)}
				>
					{children}
				</header>
			</Component>
		</NavbarContextProvider>
	);
});
Navbar.displayName = "Navbar";
