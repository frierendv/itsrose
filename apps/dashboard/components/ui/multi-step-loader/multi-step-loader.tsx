"use client";

import { Overlay } from "@react-aria/overlays";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { StepLoader, type LoadingState } from "./step-loader";

export type Step = {
	index: number;
	stepFn: () => void | Promise<void>;
};
export type MultiStepLoaderProps = {
	states: LoadingState[];
	isPending?: boolean;

	onStateChange?: () => void;
};
export const MultiStepLoader = (props: MultiStepLoaderProps) => {
	const { states, isPending, onStateChange } = props;
	const [currentState, setCurrentState] = useState<number>(0);
	useEffect(() => {
		const cleanUp = () => setCurrentState(0);
		if (!isPending) {
			cleanUp();
			return;
		}

		const timeout = setTimeout(() => {
			setCurrentState((prevState) =>
				Math.min(prevState + 1, states.length - 1)
			);
		}, 2_000);
		if (currentState + 1 >= states.length) {
			onStateChange?.();
		}

		return () => clearTimeout(timeout);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [currentState, states.length, isPending]);

	return (
		<AnimatePresence mode="wait">
			{isPending && (
				<Overlay>
					<motion.div
						initial={{
							opacity: 0,
						}}
						animate={{
							opacity: 1,
						}}
						exit={{
							opacity: 0,
						}}
						className="w-full h-full fixed inset-0 z-100 flex items-center justify-center backdrop-blur-2xl"
					>
						<div className="h-96 relative">
							<StepLoader
								value={currentState}
								loadingStates={states}
							/>
						</div>
					</motion.div>
				</Overlay>
			)}
		</AnimatePresence>
	);
};
