"use client";

import { cn, forwardRef } from "@itsrose/react/core";
import { Overlay } from "@react-aria/overlays";
import {
	AnimatePresence,
	domAnimation,
	LazyMotion,
	m,
	type HTMLMotionProps,
	type Variants,
} from "motion/react";
import { useNavbarContext } from "./context";

export const menuVariants: Variants = {
	enter: {
		height: "calc(100vh - var(--navbar-height))",
		transition: {
			duration: 0.3,
			ease: "easeOut",
		},
	},
	exit: {
		height: 0,
		transition: {
			duration: 0.25,
			ease: "easeIn",
		},
	},
};
export type NavbarMenuProps = {
	/**
	 * The container element in which the navbar menu overlay portal will be placed.
	 * @default document.body
	 */
	portalContainer?: Element;
} & Omit<HTMLMotionProps<"ul">, "ref">;

export const NavbarMenu = forwardRef<"ul", NavbarMenuProps>((props, ref) => {
	const {
		as: ignoredComponent,
		className,
		children,
		portalContainer,
		style,
		...motionProps
	} = props;
	const { isMenuOpen, height, isBlured } = useNavbarContext();

	return (
		<AnimatePresence mode="wait">
			{isMenuOpen && (
				<Overlay portalContainer={portalContainer}>
					<LazyMotion features={domAnimation}>
						<m.ul
							ref={ref}
							layoutScroll
							animate="enter"
							exit="exit"
							initial="exit"
							className={cn(
								"navbar--menu",
								{
									"navbar--blur": isBlured,
								},
								className
							)}
							data-menu-open={isMenuOpen}
							style={
								{
									"--navbar-height":
										typeof height === "number"
											? `${height}px`
											: height,
								} as React.CSSProperties
							}
							variants={menuVariants}
							{...motionProps}
						>
							{children}
						</m.ul>
					</LazyMotion>
				</Overlay>
			)}
		</AnimatePresence>
	);
});
