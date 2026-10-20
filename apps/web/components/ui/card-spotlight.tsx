"use client";

import { cn } from "@itsrose/react/core";
import { motion, useMotionTemplate, useMotionValue } from "motion/react";
import React, { type MouseEvent } from "react";

export function CardSpotlight({
	children,
	radius = 350,
	color = "var(--accent)",
	className,
	...props
}: {
	radius?: number;
	color?: string;
	children: React.ReactNode;
	className?: string;
} & React.HTMLAttributes<HTMLDivElement>) {
	const mouseX = useMotionValue(-1000);
	const mouseY = useMotionValue(-1000);

	function handleMouseMove({
		currentTarget,
		clientX,
		clientY,
	}: MouseEvent<HTMLDivElement>) {
		const { left, top } = currentTarget.getBoundingClientRect();
		mouseX.set(clientX - left);
		mouseY.set(clientY - top);
	}

	function handleMouseLeave() {
		mouseX.set(-1000);
		mouseY.set(-1000);
	}

	return (
		<div
			className={cn(
				"group relative overflow-hidden border border-border bg-surface p-6 shadow-sm transition-all duration-300 hover:border-accent/40 hover:shadow-md",
				className
			)}
			onMouseMove={handleMouseMove}
			onMouseLeave={handleMouseLeave}
			{...props}
		>
			<motion.div
				className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-300 group-hover:opacity-100"
				style={{
					background: useMotionTemplate`
						radial-gradient(
							${radius}px circle at ${mouseX}px ${mouseY}px,
							color-mix(in oklch, ${color} 14%, transparent),
							transparent 80%
						)
					`,
				}}
			/>
			<div className="relative z-10">{children}</div>
		</div>
	);
}
