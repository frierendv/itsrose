"use client";

import { Button } from "@heroui/react/button";
import { Tooltip } from "@heroui/react/tooltip";
import { cn, forwardRef } from "@itsrose/react";
import { motion } from "motion/react";
import { memo, useMemo } from "react";
import { useAudioPlayerContext } from "./context";
import type { AudioPlayerControlProps } from "./types";

const PAUSE_PATH = {
	left: "M5 5L9 5L9 19L5 19Z",
	right: "M15 5L19 5L19 19L15 19Z",
} as const;

const PLAY_PATH = {
	left: "M7 5L13 8.5L13 15.5L7 19Z",
	right: "M13 8.5L19 12L19 12L13 15.5Z",
} as const;

const SPRING_TRANSITION = {
	type: "spring" as const,
	stiffness: 300,
	damping: 24,
	mass: 0.8,
};

export const AudioPlayerControl = memo(
	forwardRef<"div", AudioPlayerControlProps>((props, ref) => {
		const { isPlaying, isBuffering, hasError, togglePlay, src } =
			useAudioPlayerContext();

		const {
			as: Comp = "div",
			className,
			iconSize = 24,
			variant = "outline",
			size = "md",
			showBufferingIndicator = true,
			playIcon,
			pauseIcon,
			...restProps
		} = props;

		const target = isPlaying ? PAUSE_PATH : PLAY_PATH;
		const isDisabled = hasError || !src;

		const renderIcon = useMemo(
			() =>
				isBuffering && showBufferingIndicator ? (
					<svg
						className="animate-spin text-accent"
						width={iconSize}
						height={iconSize}
						viewBox="0 0 24 24"
						fill="none"
						xmlns="http://www.w3.org/2000/svg"
						aria-hidden="true"
					>
						<circle
							className="opacity-25"
							cx="12"
							cy="12"
							r="10"
							stroke="currentColor"
							strokeWidth="3"
						/>
						<path
							className="opacity-75"
							fill="currentColor"
							d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
						/>
					</svg>
				) : playIcon && !isPlaying ? (
					playIcon
				) : pauseIcon && isPlaying ? (
					pauseIcon
				) : (
					<svg
						width={iconSize}
						height={iconSize}
						viewBox="0 0 24 24"
						fill="currentColor"
						stroke="currentColor"
						strokeWidth={1.2}
						strokeLinejoin="round"
						strokeLinecap="round"
						aria-hidden="true"
					>
						<motion.path
							animate={{ d: target.left }}
							transition={SPRING_TRANSITION}
							initial={false}
						/>
						<motion.path
							animate={{ d: target.right }}
							transition={SPRING_TRANSITION}
							initial={false}
						/>
					</svg>
				),
			// eslint-disable-next-line react-hooks/exhaustive-deps
			[isBuffering, isPlaying, showBufferingIndicator]
		);

		return (
			<Comp
				ref={ref}
				className={cn("flex items-center justify-center", className)}
				{...restProps}
			>
				<Tooltip delay={0}>
					<Tooltip.Trigger>
						<Button
							isIconOnly
							variant={variant}
							size={size}
							isDisabled={isDisabled}
							aria-label={
								isPlaying ? "Pause audio" : "Play audio"
							}
							onPress={togglePlay}
							className="relative transition-transform active:scale-95"
						>
							{renderIcon}
							<span className="sr-only">
								{isPlaying ? "Pause audio" : "Play audio"}
							</span>
						</Button>
					</Tooltip.Trigger>
					<Tooltip.Content>
						<Tooltip.Arrow />
						{isPlaying ? "Pause" : "Play"}
					</Tooltip.Content>
				</Tooltip>
			</Comp>
		);
	})
);

AudioPlayerControl.displayName = "AudioPlayerControl";
