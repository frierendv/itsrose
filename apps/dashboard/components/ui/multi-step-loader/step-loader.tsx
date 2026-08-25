"use client";

import { CircleCheckFill } from "@gravity-ui/icons";
import { Spinner } from "@heroui/react";
import { cn } from "@itsrose/react/core";
import { motion } from "motion/react";

export type LoadingState = {
	text: string;
};

export type StepLoaderStateProps = {
	index: number;
	value: number;

	text: string;
};
export const StepLoaderState = ({
	index,
	value,
	text,
}: StepLoaderStateProps) => {
	const distance = Math.abs(index - value);
	const opacity = Math.max(1 - distance * 0.2, 0); // Minimum opacity is 0, keep it 0.2 if you're sane.
	return (
		<motion.div
			key={index}
			className="text-left flex gap-2 mb-4 items-center"
			initial={{ opacity: 0, y: -(value * 40) }}
			animate={{ opacity: opacity, y: -(value * 40) }}
			transition={{ duration: 0.5 }}
		>
			<div>
				{index > value && <Spinner size="sm" />}
				{index <= value && (
					<CircleCheckFill
						className={cn(
							"text-black dark:text-white",
							value === index && "text-success opacity-100"
						)}
					/>
				)}
			</div>
			<span
				className={cn(
					"text-black dark:text-white",
					value === index &&
						"text-black dark:text-lime-500 opacity-100"
				)}
			>
				{text}
			</span>
		</motion.div>
	);
};

export const StepLoader = ({
	loadingStates,
	value = 0,
}: {
	loadingStates: LoadingState[];
	value?: number;
}) => {
	return (
		<div className="flex relative justify-start max-w-xl mx-auto flex-col mt-40">
			{loadingStates.map((loadingState, index) => (
				<StepLoaderState
					key={index}
					value={value}
					index={index}
					text={loadingState.text}
				/>
			))}
		</div>
	);
};
