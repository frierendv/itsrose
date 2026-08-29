"use client";

import { motion, useMotionTemplate, useMotionValue } from "motion/react";
import React, { type MouseEvent } from "react";

export const CardSpotlight = ({
	children,
	radius = 280,
	className = "",
	...props
}: {
	children: React.ReactNode;
	radius?: number;
	className?: string;
} & React.HTMLAttributes<HTMLDivElement>) => {
	const mouseX = useMotionValue(0);
	const mouseY = useMotionValue(0);

	function handleMouseMove({
		currentTarget,
		clientX,
		clientY,
	}: MouseEvent<HTMLDivElement>) {
		const { left, top } = currentTarget.getBoundingClientRect();
		mouseX.set(clientX - left);
		mouseY.set(clientY - top);
	}

	return (
		<div
			className={`group relative overflow-hidden ${className}`}
			onMouseMove={handleMouseMove}
			{...props}
		>
			<motion.div
				className="pointer-events-none absolute -inset-px opacity-0 transition duration-300 group-hover:opacity-100 z-10"
				style={{
					background: useMotionTemplate`
						radial-gradient(
							${radius}px circle at ${mouseX}px ${mouseY}px,
							color-mix(in oklch, var(--accent) 15%, transparent),
							transparent 80%
						)
					`,
				}}
			/>
			{children}
		</div>
	);
};
