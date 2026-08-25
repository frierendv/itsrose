"use client";

import { LampContainer } from "@/components/ui/lamp";
import { cn, forwardRef } from "@itsrose/react/core";
import { motion, type HTMLMotionProps } from "motion/react";
import { useMemo } from "react";

export const AnimatedText = forwardRef<"h1", HTMLMotionProps<"h1">>(
	({ className, as: Component = "h1", ...props }, ref) => {
		const MotionComponent = useMemo(
			() => motion.create(Component),
			[Component]
		);
		return (
			<LampContainer>
				<MotionComponent
					ref={ref}
					initial={{ opacity: 0.5, y: 100 }}
					whileInView={{ opacity: 1, y: 0 }}
					transition={{
						delay: 0.3,
						duration: 0.8,
						ease: "linear",
					}}
					className={cn(
						"mt-8",
						"bg-linear-to-r",
						"from-slate-800 via-slate-600 to-indigo-600",
						"dark:from-white dark:via-slate-300 dark:to-indigo-300",
						"bg-clip-text",
						"text-center",
						"text-4xl",
						"font-medium",
						"tracking-tight",
						"text-transparent",
						"italic",
						"md:text-7xl",
						className
					)}
					{...props}
				/>
			</LampContainer>
		);
	}
);
AnimatedText.displayName = "AnimatedText";
