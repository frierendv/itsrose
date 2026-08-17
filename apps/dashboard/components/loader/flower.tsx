"use client";

import { cn } from "@/shared/utils";
import { motion } from "motion/react";
import React from "react";

export type FlowerLoaderProps = {
	/** Size of the flower loader in pixels (default: 48) */
	size?: number;
	/** Optional custom color overrides */
	colors?: {
		light?: string;
		pink?: string;
		hot?: string;
		core?: string;
	};
	/** Additional wrapper class names */
	className?: string;
};

export function FlowerLoader({
	size = 48,
	colors = {},
	className = "",
}: FlowerLoaderProps) {
	const {
		light = "#ffd6e7",
		pink = "#ff5fa2",
		hot = "#ff2d8a",
		core = "rgb(105, 0, 81)",
	} = colors;

	const scale = size / 32;

	return (
		<div
			role="status"
			aria-label="Loading"
			className={cn(
				"inline-flex items-center justify-center overflow-visible",
				className
			)}
			style={
				{
					"--light": light,
					"--pink": pink,
					"--hot": hot,
					"--core": core,
					width: `${size}px`,
					height: `${size}px`,
				} as React.CSSProperties
			}
		>
			{/* Inner 32px flower scaled and centered inside outer container */}
			<motion.div
				className="relative h-8 w-8 origin-center"
				style={{
					scale,
				}}
				animate={{
					rotate: [0, 360],
					y: [0, -8, 0],
				}}
				transition={{
					rotate: {
						duration: 10,
						repeat: Infinity,
						ease: "linear",
					},
					y: {
						duration: 3,
						repeat: Infinity,
						ease: "easeInOut",
					},
				}}
			>
				{/* 8 Petals */}
				{Array.from({ length: 8 }).map((_, i) => (
					<div
						key={i}
						className="absolute inset-0"
						style={{ transform: `rotate(${i * 45}deg)` }}
					>
						<motion.div
							className="absolute left-1/2 top-0 h-8.25 w-3.5 rounded-full"
							style={{
								background:
									"linear-gradient(to bottom, var(--light), var(--pink), var(--hot))",
								boxShadow:
									"0 0 12px rgba(255, 95, 162, 0.6), 0 0 30px rgba(255, 45, 138, 0.45)",
							}}
							animate={{
								x: "-50%",
								scale: [0.65, 1.15, 0.65],
								opacity: [0.55, 1, 0.55],
							}}
							transition={{
								duration: 1.6,
								repeat: Infinity,
								ease: "easeInOut",
								delay: i * 0.12,
							}}
						/>
					</div>
				))}

				{/* Core */}
				<motion.div
					className="absolute inset-[38%] rounded-full"
					style={{
						backgroundColor: "var(--core)",
						boxShadow:
							"0 0 15px white, 0 0 35px var(--pink), 0 0 60px var(--hot)",
					}}
					animate={{
						scale: [0.9, 1.25, 0.9],
					}}
					transition={{
						duration: 1.2,
						repeat: Infinity,
						ease: "easeInOut",
					}}
				/>
			</motion.div>
		</div>
	);
}
