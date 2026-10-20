"use client";

import BackwardStep from "@gravity-ui/icons/BackwardStep";
import ForwardStep from "@gravity-ui/icons/ForwardStep";
import { Button } from "@heroui/react/button";
import { cn, forwardRef } from "@itsrose/react";
import { useMemo } from "react";
import { useAudioPlayerContext } from "./context";
import type { AudioPlayerSkipProps } from "./types";

export const AudioPlayerSkip = forwardRef<"div", AudioPlayerSkipProps>(
	(props, ref) => {
		const { skip } = useAudioPlayerContext();

		const {
			as: Comp = "div",
			className,
			seconds = 10,
			direction,
			variant = "ghost",
			size = "md",

			children,
			...restProps
		} = props;

		const isBackward =
			direction === "backward" || (!direction && seconds < 0);
		const delta = isBackward ? -Math.abs(seconds) : Math.abs(seconds);

		const Icon = useMemo(
			() => (isBackward ? BackwardStep : ForwardStep),
			[isBackward]
		);
		const label = isBackward
			? `Rewind ${Math.abs(delta)} seconds`
			: `Skip forward ${Math.abs(delta)} seconds`;

		return (
			<Comp
				ref={ref}
				className={cn("flex items-center justify-center", className)}
				{...restProps}
			>
				<Button
					isIconOnly
					variant={variant}
					size={size}
					aria-label={label}
					onPress={() => skip(delta)}
					className="text-muted hover:text-foreground"
				>
					{children ?? <Icon aria-hidden />}
					<span className="sr-only">{label}</span>
				</Button>
			</Comp>
		);
	}
);

AudioPlayerSkip.displayName = "AudioPlayerSkip";
