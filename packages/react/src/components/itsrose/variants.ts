import type { Variants } from "motion/react";

export const variants: Variants = {
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

export const petalsVariants: Variants = {
	hidden: { opacity: 0, scale: 0.94 },
	visible: {
		opacity: 1,
		scale: 1,
		transition: { duration: 0.45, ease: "easeOut" },
	},
};
