"use client";

import { motion, useReducedMotion } from "motion/react";
import type { SVGMotionProps } from "motion/react";
import { PETALS } from "./constant";
import { petalsVariants, variants } from "./variants";

export type BrandIconProps = SVGMotionProps<SVGSVGElement> & {
	size?: number | string;
	animated?: boolean;
};

export const BrandIcon: React.FC<BrandIconProps> = (props) => {
	const { size = 24, animated = true, ...restProps } = props;
	const shouldReduceMotion = useReducedMotion();
	const enableMotion = animated && !shouldReduceMotion;

	return (
		<motion.svg
			xmlns="http://www.w3.org/2000/svg"
			width={size}
			height={size}
			viewBox="0 0 1500 1500"
			aria-hidden="true"
			initial={enableMotion ? "hidden" : false}
			animate={enableMotion ? "visible" : undefined}
			whileHover={enableMotion ? "hover" : undefined}
			variants={variants}
			{...restProps}
		>
			{PETALS.map(({ fill, d }, index) => (
				<motion.path
					key={index}
					fill={fill}
					d={d}
					variants={petalsVariants}
					style={{
						transformBox: "view-box",
						transformOrigin: "center",
					}}
				/>
			))}
		</motion.svg>
	);
};

BrandIcon.displayName = "ItsRose.BrandIcon";
