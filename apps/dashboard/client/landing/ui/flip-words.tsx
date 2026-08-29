"use client";

import { AnimatePresence, motion } from "motion/react";
import React, { useCallback, useEffect, useState } from "react";

export const FlipWords = ({
	words,
	duration = 2500,
	className,
}: {
	words: string[];
	duration?: number;
	className?: string;
}) => {
	const [currentWord, setCurrentWord] = useState(words[0] || "");
	const [isAnimating, setIsAnimating] = useState<boolean>(false);

	const startAnimation = useCallback(() => {
		const word = words[words.indexOf(currentWord) + 1] || words[0] || "";
		setCurrentWord(word);
		setIsAnimating(true);
	}, [currentWord, words]);

	useEffect(() => {
		if (!isAnimating) {
			const timer = setTimeout(() => {
				startAnimation();
			}, duration);
			return () => clearTimeout(timer);
		}
	}, [isAnimating, duration, startAnimation]);

	return (
		<AnimatePresence
			onExitComplete={() => {
				setIsAnimating(false);
			}}
		>
			<motion.span
				initial={{
					opacity: 0,
					y: 10,
				}}
				animate={{
					opacity: 1,
					y: 0,
				}}
				transition={{
					type: "spring",
					stiffness: 100,
					damping: 10,
				}}
				exit={{
					opacity: 0,
					y: -20,
					filter: "blur(6px)",
					scale: 1.05,
					position: "absolute",
				}}
				className={`inline-block relative text-left text-accent ${className || ""}`}
				key={currentWord}
			>
				{currentWord.split(" ").map((word, wordIndex) => (
					<motion.span
						key={word + wordIndex}
						initial={{ opacity: 0, y: 10, filter: "blur(6px)" }}
						animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
						transition={{
							delay: wordIndex * 0.2,
							duration: 0.3,
						}}
						className="inline-block whitespace-nowrap"
					>
						{word.split("").map((letter, letterIndex) => (
							<motion.span
								key={word + letterIndex}
								initial={{
									opacity: 0,
									y: 8,
									filter: "blur(6px)",
								}}
								animate={{
									opacity: 1,
									y: 0,
									filter: "blur(0px)",
								}}
								transition={{
									delay: wordIndex * 0.2 + letterIndex * 0.04,
									duration: 0.2,
								}}
								className="inline-block"
							>
								{letter}
							</motion.span>
						))}
						<span className="inline-block">&nbsp;</span>
					</motion.span>
				))}
			</motion.span>
		</AnimatePresence>
	);
};
