"use client";

import { cn } from "@itsrose/react/core";
import { motion } from "motion/react";

export const BackgroundBeams = ({ className }: { className?: string }) => {
	const paths = [
		"M-380 -189C-380 -189 -312 216 152 343C616 470 684 875 684 875",
		"M-373 -197C-373 -197 -305 208 159 335C623 462 691 867 691 867",
		"M-366 -205C-366 -205 -298 200 166 327C630 454 698 859 698 859",
		"M-359 -213C-359 -213 -291 192 173 319C637 446 705 851 705 851",
		"M-352 -221C-352 -221 -284 184 180 311C644 438 712 843 712 843",
	];

	return (
		<div
			className={cn(
				"pointer-events-none absolute inset-0 z-0 overflow-hidden opacity-30 dark:opacity-25",
				className
			)}
			aria-hidden="true"
		>
			<svg
				className="absolute h-full w-full"
				viewBox="0 0 696 316"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
			>
				<defs>
					<linearGradient
						id="beam-gradient"
						x1="0%"
						y1="0%"
						x2="100%"
						y2="100%"
					>
						<stop
							offset="0%"
							stopColor="var(--accent)"
							stopOpacity="0"
						/>
						<stop
							offset="50%"
							stopColor="var(--accent)"
							stopOpacity="0.45"
						/>
						<stop
							offset="100%"
							stopColor="var(--accent)"
							stopOpacity="0"
						/>
					</linearGradient>
				</defs>
				{paths.map((path, idx) => (
					<motion.path
						key={idx}
						d={path}
						stroke="url(#beam-gradient)"
						strokeWidth="1.2"
						strokeOpacity="0.4"
						initial={{ pathLength: 0.1, pathOffset: 0 }}
						animate={{
							pathLength: [0.1, 0.4, 0.1],
							pathOffset: [0, 1, 0],
						}}
						transition={{
							duration: 12 + idx * 3,
							ease: "linear",
							repeat: Number.POSITIVE_INFINITY,
						}}
					/>
				))}
			</svg>
		</div>
	);
};
