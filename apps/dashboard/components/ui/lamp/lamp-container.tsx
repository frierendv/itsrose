/**
 * Ref: https://ui.aceternity.com/components/lamp-effect
 */
"use client";

import { cn, forwardRef } from "@/shared/utils";
import { motion } from "motion/react";

export const LampContainer = forwardRef<"div">(
	({ children, className, as: Comp = "div", ...props }, ref) => {
		return (
			<Comp
				ref={ref}
				className={cn(
					"relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background w-full rounded-md z-0",
					className
				)}
				{...props}
			>
				<div className="relative flex w-full flex-1 scale-y-125 items-center justify-center isolate z-0">
					{/* Left light cone */}
					{/* <motion.div
						initial={{ opacity: 0.5, width: "15rem" }}
						whileInView={{ opacity: 1, width: "30rem" }}
						transition={{
							delay: 0.3,
							duration: 0.8,
							ease: "easeInOut",
						}}
						style={{
							backgroundImage:
								"conic-gradient(from 70deg at 50% 0%, var(--accent) 0deg, transparent 60deg)",
						}}
						className="absolute inset-auto right-1/2 h-56 w-120 overflow-visible"
					>
						<div className="absolute w-full left-0 bg-background h-40 bottom-0 z-20 mask-[linear-gradient(to_top,white,transparent)] [-webkit-mask-image:linear-gradient(to_top,white,transparent)]" />
						<div className="absolute w-40 h-full left-0 bg-background bottom-0 z-20 mask-[linear-gradient(to_right,white,transparent)] [-webkit-mask-image:linear-gradient(to_right,white,transparent)]" />
					</motion.div> */}

					{/* Right light cone */}
					{/* <motion.div
						initial={{ opacity: 0.5, width: "15rem" }}
						whileInView={{ opacity: 1, width: "30rem" }}
						transition={{
							delay: 0.3,
							duration: 0.8,
							ease: "easeInOut",
						}}
						style={{
							backgroundImage:
								"conic-gradient(from 290deg at 50% 0%, transparent 0deg, transparent 300deg, var(--accent) 360deg)",
						}}
						className="absolute inset-auto left-1/2 h-56 w-120 overflow-visible"
					>
						<div className="absolute w-40 h-full right-0 bg-background bottom-0 z-20 mask-[linear-gradient(to_right,white,transparent)] [-webkit-mask-image:linear-gradient(to_left,white,transparent)]" />
						<div className="absolute w-full right-0 bg-background h-40 bottom-0 z-20 mask-[linear-gradient(to_top,white,transparent)] [-webkit-mask-image:linear-gradient(to_top,white,transparent)]" />
					</motion.div> */}

					{/* Base blur behind lamp */}
					<div className="absolute top-1/2 h-48 w-full translate-y-12 scale-x-150 bg-background blur-2xl" />
					<div className="absolute top-1/2 z-50 h-48 w-full bg-transparent opacity-10 backdrop-blur-md" />

					{/* Soft glow blob */}
					<div className="absolute inset-auto z-50 h-36 w-md -translate-y-1/2 rounded-full bg-accent/40 opacity-50 blur-3xl" />

					{/* Core glow blob */}
					<motion.div
						initial={{ width: "8rem" }}
						whileInView={{ width: "16rem" }}
						transition={{
							delay: 0.3,
							duration: 0.8,
							ease: "easeInOut",
						}}
						className="absolute inset-auto z-30 h-36 w-64 -translate-y-24 rounded-full bg-accent blur-2xl"
					/>

					{/* Glowing lamp line */}
					<motion.div
						initial={{ width: "15rem" }}
						whileInView={{ width: "30rem" }}
						transition={{
							delay: 0.3,
							duration: 0.8,
							ease: "easeInOut",
						}}
						className="absolute inset-auto z-50 h-0.5 w-120 -translate-y-28 bg-accent"
					/>

					{/* Top cover rectangle to bolck upper half of conic gradient */}
					<div className="absolute inset-auto z-40 h-44 w-full -translate-y-50 bg-background" />
				</div>

				<div className="relative z-50 flex -translate-y-80 flex-col items-center px-5">
					{children}
				</div>
			</Comp>
		);
	}
);
