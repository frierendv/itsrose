"use client";

import { cn, forwardRef } from "@itsrose/react/core";
import { motion } from "motion/react";
import { useMemo } from "react";
import { useNavbarContext } from "./context";

export type NavbarMenuToggleProps = {};

export const NavbarMenuToggle = forwardRef<"button", NavbarMenuToggleProps>(
	(props, ref) => {
		const {
			as: Component = "button",
			children,
			className,
			// ---
			...otherProps
		} = props;

		const { isMenuOpen, setIsMenuOpen } = useNavbarContext();

		const child = useMemo(() => {
			return (
				<motion.svg
					className="pointer-events-none size-6"
					viewBox="0 0 16 16"
					fill="none"
					xmlns="http://www.w3.org/2000/svg"
					aria-hidden
				>
					<motion.line
						x1="2"
						x2="14"
						stroke="currentColor"
						strokeWidth="1.25"
						strokeLinecap="round"
						variants={{
							closed: { y1: 4, y2: 4, rotate: 0 },
							open: { y1: 8, y2: 8, rotate: 45 },
						}}
						initial="closed"
						animate={isMenuOpen ? "open" : "closed"}
						transition={{
							duration: 0.22,
							ease: [0.4, 0, 0.2, 1],
						}}
					/>

					<motion.line
						x1="2"
						x2="14"
						stroke="currentColor"
						strokeWidth="1.25"
						strokeLinecap="round"
						variants={{
							closed: { y1: 8, y2: 8, opacity: 1 },
							open: { y1: 8, y2: 8, opacity: 0 },
						}}
						initial="closed"
						animate={isMenuOpen ? "open" : "closed"}
						transition={{
							duration: 0.12,
							ease: "easeOut",
						}}
					/>

					<motion.line
						x1="2"
						x2="14"
						stroke="currentColor"
						strokeWidth="1.25"
						strokeLinecap="round"
						variants={{
							closed: { y1: 12, y2: 12, rotate: 0 },
							open: { y1: 8, y2: 8, rotate: -45 },
						}}
						initial="closed"
						animate={isMenuOpen ? "open" : "closed"}
						transition={{
							duration: 0.22,
							ease: [0.4, 0, 0.2, 1],
						}}
					/>
				</motion.svg>
			);
		}, [isMenuOpen]);

		const srOnlyText = useMemo(() => {
			return isMenuOpen
				? "close navigation menu"
				: "open navigation menu";
		}, [isMenuOpen]);

		return (
			<Component
				ref={ref}
				data-menu-open={isMenuOpen}
				onClick={() => setIsMenuOpen((prev) => !prev)}
				className={cn("group", className)}
				{...otherProps}
			>
				<span className="sr-only">{srOnlyText}</span>
				{children ?? child}
			</Component>
		);
	}
);
