"use client";

import { motion, useScroll, useSpring, useTransform } from "motion/react";
import React, { useRef } from "react";

export const ParallaxSection = ({
	children,
	offset = 30,
	className = "",
}: {
	children: React.ReactNode;
	offset?: number;
	className?: string;
}) => {
	const ref = useRef<HTMLDivElement>(null);
	const { scrollYProgress } = useScroll({
		target: ref,
		offset: ["start end", "end start"],
	});

	const rawY = useTransform(scrollYProgress, [0, 1], [offset, -offset]);
	const y = useSpring(rawY, { stiffness: 100, damping: 20 });

	return (
		<motion.div ref={ref} style={{ y }} className={className}>
			{children}
		</motion.div>
	);
};

export const InViewReveal = ({
	children,
	delay = 0,
	className = "",
	direction = "up",
}: {
	children: React.ReactNode;
	delay?: number;
	className?: string;
	direction?: "up" | "down" | "none";
}) => {
	const initialY = direction === "up" ? 24 : direction === "down" ? -24 : 0;

	return (
		<motion.div
			initial={{ opacity: 0, y: initialY }}
			whileInView={{ opacity: 1, y: 0 }}
			viewport={{ once: true, margin: "-40px" }}
			transition={{
				duration: 0.6,
				delay,
				ease: [0.21, 0.47, 0.32, 0.98],
			}}
			className={className}
		>
			{children}
		</motion.div>
	);
};
