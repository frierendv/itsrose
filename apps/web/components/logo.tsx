"use client";

import {
	motion,
	useReducedMotion,
	type SVGMotionProps,
	type Variants,
} from "motion/react";
import { memo } from "react";

export type LogoIconProps = SVGMotionProps<SVGSVGElement> & {
	size?: number | string;
	animated?: boolean;
};

const petals = [
	{
		fill: "#f9c0be",
		d: "M 621.25 827.105469 C 718.175781 895.527344 910.273438 894.34375 992.082031 793.238281 C 870.839844 1248.566406 418.996094 1062.667969 482.40625 634.246094 C 504.628906 716.324219 539.964844 772.863281 608.429688 821.210938 L 621.25 827.105469",
	},
	{
		fill: "#f4c1bd",
		d: "M 958.523438 360.078125 C 1278.214844 597.4375 1130.449219 1106.191406 712.210938 1185.128906 C 1324.871094 1290.449219 1522.363281 557.378906 958.523438 360.078125",
	},
	{
		fill: "#f2849d",
		d: "M 800.417969 347.832031 C 743.0625 333.242188 672.910156 343.710938 626.464844 382.339844 C 578.558594 422.171875 567.789062 503.589844 570.269531 568.757812 C 707.816406 409.082031 959.523438 491.984375 1016.082031 553.371094 C 976.191406 462.300781 895.292969 371.960938 800.417969 347.832031",
	},
	{
		fill: "#f7cfcb",
		d: "M 858.839844 569.507812 C 822.386719 568.210938 785.230469 581.164062 764.714844 613.441406 C 746.089844 642.597656 736.527344 697.546875 777.785156 712.75 C 729.035156 660.351562 836.800781 610.59375 873.6875 665.566406 C 913.167969 724.449219 848.117188 769.542969 794.679688 767.71875 C 739.78125 765.898438 678.695312 723.378906 683.566406 661.421875 C 689.351562 586.921875 769.953125 531.542969 835.410156 518.683594 C 757.703125 518.296875 639.898438 561.726562 638.050781 656.234375 C 636.207031 744.503906 710.136719 814.5625 794.019531 810.171875 C 861.320312 806.710938 947.320312 780.035156 986.320312 719.464844 C 1042.515625 632.105469 931.289062 571.921875 858.839844 569.507812",
	},
	{
		fill: "#f4c1bd",
		d: "M 259.589844 626.1875 C 282.359375 766.242188 365.308594 911.597656 505.628906 947.539062 C 346.773438 734.304688 396.589844 498.765625 615.078125 356.730469 C 498.414062 349.949219 283.976562 342.390625 263.257812 575.496094 C 263.074219 577.203125 254.082031 592.042969 259.589844 626.1875",
	},
	{
		fill: "#f9c0be",
		d: "M 918.378906 242.921875 C 799.621094 209.144531 668.449219 232.085938 572.546875 312.367188 C 714.851562 271.261719 995.226562 289.058594 1097.480469 416.09375 C 1082.953125 329.394531 996.613281 265.09375 918.378906 242.921875",
	},
	{
		fill: "#f2849d",
		d: "M 802.601562 1093.714844 C 546.453125 1277.882812 321.363281 1167.417969 341.605469 879.390625 C 453.078125 1097.175781 706.382812 1110.171875 802.601562 1093.714844",
	},
] as const;

const petalsVariants: Variants = {
	hidden: { opacity: 0, scale: 0.94 },
	visible: {
		opacity: 1,
		scale: 1,
		transition: { duration: 0.45, ease: "easeOut" },
	},
};

const variants: Variants = {
	hidden: { opacity: 0, scale: 0.88, rotate: -12 },
	visible: {
		opacity: 1,
		scale: 1,
		rotate: 0,
		transition: {
			opacity: { duration: 0.5 },
			scale: {
				type: "spring",
				stiffness: 150,
				damping: 14,
			},
			rotate: { duration: 0.8, ease: "easeOut" },
			staggerChildren: 0.075,
		},
	},
	hover: {
		scale: 1.08,
		rotate: 5,
		transition: { type: "spring", stiffness: 240, damping: 12 },
	},
};
export const LogoIcon = memo<LogoIconProps>(
	({ size = 24, animated = true, ...props }) => {
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
				{...props}
			>
				{petals.map(({ fill, d }, index) => (
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
	}
);

LogoIcon.displayName = "LogoIcon";
