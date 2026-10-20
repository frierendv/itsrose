"use client";

import { cn, forwardRef } from "@itsrose/react";
import { useAudioPlayerContext } from "./context";
import type { AudioPlayerTimeProps } from "./types";

export function formatTime(seconds: number): string {
	if (!isFinite(seconds) || isNaN(seconds) || seconds < 0) {
		return "0:00";
	}

	const totalSeconds = Math.floor(seconds);
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const remainingSecs = totalSeconds % 60;

	const paddedSecs = remainingSecs.toString().padStart(2, "0");

	if (hours > 0) {
		const paddedMins = minutes.toString().padStart(2, "0");
		return `${hours}:${paddedMins}:${paddedSecs}`;
	}

	return `${minutes}:${paddedSecs}`;
}

export const AudioPlayerTime = forwardRef<"span", AudioPlayerTimeProps>(
	(props, ref) => {
		const { currentTime, duration } = useAudioPlayerContext();
		const {
			as: Comp = "span",
			className,
			type = "current",
			format = formatTime,
			...restProps
		} = props;

		let secondsToDisplay: number;
		let prefix = "";

		switch (type) {
			case "duration":
			case "total":
				secondsToDisplay = duration;
				break;
			case "remaining":
				secondsToDisplay = Math.max(0, duration - currentTime);
				prefix = "-";
				break;
			case "current":
			default:
				secondsToDisplay = currentTime;
				break;
		}

		return (
			<Comp
				ref={ref}
				className={cn(
					"text-xs font-mono tabular-nums text-muted select-none",
					className
				)}
				{...restProps}
			>
				{prefix}
				{format(secondsToDisplay)}
			</Comp>
		);
	}
);

AudioPlayerTime.displayName = "AudioPlayerTime";
