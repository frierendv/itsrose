"use client";

import { motion, useScroll, useSpring, useTransform } from "motion/react";
import React, { useRef } from "react";

type SpotlightProps = {
	className?: string;
	translateY?: number;
	width?: number;
	height?: number;
	smallWidth?: number;
	duration?: number;
	xOffset?: number;
};

export const SpotlightNew = ({
	className,
	translateY = -280,
	width = 560,
	height = 1380,
	smallWidth = 240,
	duration = 7,
	xOffset = 100,
}: SpotlightProps) => {
	const ref = useRef<HTMLDivElement>(null);
	const { scrollY } = useScroll();
	const rawY = useTransform(scrollY, [0, 800], [0, 120]);
	const parallaxY = useSpring(rawY, { stiffness: 80, damping: 20 });

	return (
		<motion.div
			ref={ref}
			initial={{
				opacity: 0,
			}}
			animate={{
				opacity: 1,
			}}
			transition={{
				duration: 1.5,
			}}
			style={{
				y: parallaxY,
			}}
			className={`pointer-events-none absolute inset-0 z-0 overflow-hidden ${className || ""}`}
		>
			<motion.div
				animate={{
					x: [0, xOffset, 0],
				}}
				transition={{
					duration,
					repeat: Infinity,
					repeatType: "reverse",
					ease: "easeInOut",
				}}
				className="absolute top-0 left-0 w-screen h-screen z-0 pointer-events-none"
			>
				<div
					style={{
						transform: `translateY(${translateY}px) rotate(-45deg)`,
						background:
							"radial-gradient(ellipse at center, var(--accent) 0%, transparent 70%)",
						width: `${width}px`,
						height: `${height}px`,
					}}
					className="absolute top-0 left-1/4 opacity-15 blur-3xl"
				/>

				<div
					style={{
						transform: `translateY(${translateY + 100}px) rotate(45deg)`,
						background:
							"radial-gradient(ellipse at center, var(--accent) 0%, transparent 70%)",
						width: `${smallWidth}px`,
						height: `${height}px`,
					}}
					className="absolute top-0 right-1/4 opacity-10 blur-3xl"
				/>
			</motion.div>
		</motion.div>
	);
};
