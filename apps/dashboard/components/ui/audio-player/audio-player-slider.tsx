"use client";

import { cn, forwardRef } from "@itsrose/react";
import {
	memo,
	useCallback,
	useRef,
	useState,
	type KeyboardEvent,
	type PointerEvent,
} from "react";
import { AudioPlayerTime, formatTime } from "./audio-player-time";
import { useAudioPlayerContext } from "./context";
import type {
	AudioPlayerFillProps,
	AudioPlayerSliderProps,
	AudioPlayerThumbProps,
	AudioPlayerTrackProps,
} from "./types";

export const AudioPlayerFill = memo(
	forwardRef<"div", AudioPlayerFillProps>((props, ref) => {
		const { progress, buffered } = useAudioPlayerContext();
		const {
			as: Comp = "div",
			className,
			progressClassName,
			bufferedClassName,
			showBuffered = true,
			...restProps
		} = props;

		const safeProgress = Math.min(Math.max(progress, 0), 100);
		const safeBuffered = Math.min(Math.max(buffered, 0), 100);

		return (
			<Comp
				ref={ref}
				className={cn(
					"relative w-full h-1.5 group-hover:h-2 group-focus-within:h-2 bg-default/40 dark:bg-default/30 rounded-full overflow-hidden transition-[height]",
					className
				)}
				{...restProps}
			>
				{showBuffered && safeBuffered > 0 && (
					<div
						className={cn(
							"absolute inset-y-0 left-0 bg-muted/20 rounded-full pointer-events-none transition-all duration-200",
							bufferedClassName
						)}
						style={{ width: `${safeBuffered}%` }}
					/>
				)}
				<div
					className={cn(
						"absolute inset-y-0 left-0 bg-accent rounded-full pointer-events-none",
						progressClassName
					)}
					style={{ width: `${safeProgress}%` }}
				/>
			</Comp>
		);
	})
);
AudioPlayerFill.displayName = "AudioPlayerFill";

export const AudioPlayerThumb = memo(
	forwardRef<"div", AudioPlayerThumbProps>((props, ref) => {
		const { progress, isScrubbing } = useAudioPlayerContext();
		const { as: Comp = "div", className, ...restProps } = props;
		const safeProgress = Math.min(Math.max(progress, 0), 100);

		return (
			<Comp
				ref={ref}
				className={cn(
					"absolute top-1/2 -translate-y-1/2 -translate-x-1/2 size-3.5 bg-accent ring-2 ring-surface rounded-full shadow-sm pointer-events-none transition-all duration-150",
					isScrubbing
						? "opacity-100 scale-125"
						: "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 scale-100",
					className
				)}
				style={{ left: `${safeProgress}%` }}
				{...restProps}
			/>
		);
	})
);
AudioPlayerThumb.displayName = "AudioPlayerThumb";

export const AudioPlayerTrack = memo(
	forwardRef<"div", AudioPlayerTrackProps>((props, ref) => {
		const {
			currentTime,
			duration,
			seek,
			seekPercent,
			skip,
			setIsScrubbing,
			isScrubbing,
		} = useAudioPlayerContext();

		const {
			as: Comp = "div",
			className,
			children,
			showTooltip = true,
			...restProps
		} = props;

		const trackRef = useRef<HTMLDivElement | null>(null);
		const [hoverX, setHoverX] = useState<number | null>(null);
		const [hoverTime, setHoverTime] = useState<number>(0);

		const getPercentageFromEvent = useCallback(
			(e: PointerEvent<HTMLDivElement>) => {
				const track = trackRef.current;
				if (!track) {
					return 0;
				}
				const rect = track.getBoundingClientRect();
				const x = e.clientX - rect.left;
				const percentage = (x / rect.width) * 100;
				return Math.min(Math.max(percentage, 0), 100);
			},
			[]
		);

		const handlePointerDown = useCallback(
			(e: PointerEvent<HTMLDivElement>) => {
				e.preventDefault();
				e.currentTarget.setPointerCapture(e.pointerId);
				setIsScrubbing(true);
				const percent = getPercentageFromEvent(e);
				seekPercent(percent);
			},
			[getPercentageFromEvent, seekPercent, setIsScrubbing]
		);

		const handlePointerMove = useCallback(
			(e: PointerEvent<HTMLDivElement>) => {
				const track = trackRef.current;
				if (!track) {
					return;
				}

				const percent = getPercentageFromEvent(e);

				if (duration > 0) {
					setHoverTime((percent / 100) * duration);
					const rect = track.getBoundingClientRect();
					setHoverX(e.clientX - rect.left);
				}

				if (isScrubbing) {
					seekPercent(percent);
				}
			},
			[duration, getPercentageFromEvent, isScrubbing, seekPercent]
		);

		const handlePointerUp = useCallback(
			(e: PointerEvent<HTMLDivElement>) => {
				if (isScrubbing) {
					const percent = getPercentageFromEvent(e);
					seekPercent(percent);
					setIsScrubbing(false);
				}
			},
			[getPercentageFromEvent, isScrubbing, seekPercent, setIsScrubbing]
		);

		const handlePointerCancel = useCallback(() => {
			setIsScrubbing(false);
			setHoverX(null);
		}, [setIsScrubbing]);

		const handlePointerLeave = useCallback(() => {
			if (!isScrubbing) {
				setHoverX(null);
			}
		}, [isScrubbing]);

		const handleKeyDown = useCallback(
			(e: KeyboardEvent<HTMLDivElement>) => {
				switch (e.key) {
					case "ArrowRight":
					case "ArrowUp":
						e.preventDefault();
						skip(5);
						break;
					case "ArrowLeft":
					case "ArrowDown":
						e.preventDefault();
						skip(-5);
						break;
					case "PageUp":
						e.preventDefault();
						skip(15);
						break;
					case "PageDown":
						e.preventDefault();
						skip(-15);
						break;
					case "Home":
						e.preventDefault();
						seek(0);
						break;
					case "End":
						e.preventDefault();
						seek(duration);
						break;
				}
			},
			[duration, seek, skip]
		);

		return (
			<Comp
				ref={(node: HTMLDivElement | null) => {
					trackRef.current = node;
					if (typeof ref === "function") {
						ref(node);
					} else if (ref) {
						ref.current = node;
					}
				}}
				role="slider"
				tabIndex={0}
				aria-label="Audio playback progress"
				aria-valuenow={Math.round(currentTime)}
				aria-valuemin={0}
				aria-valuemax={Math.round(duration)}
				aria-valuetext={`${formatTime(currentTime)} of ${formatTime(duration)}`}
				onPointerDown={handlePointerDown}
				onPointerMove={handlePointerMove}
				onPointerUp={handlePointerUp}
				onPointerCancel={handlePointerCancel}
				onPointerLeave={handlePointerLeave}
				onKeyDown={handleKeyDown}
				className={cn(
					"relative py-2.5 cursor-pointer touch-none flex items-center outline-none focus-visible:ring-2 focus-visible:ring-focus rounded-full",
					className
				)}
				{...restProps}
			>
				{children ?? (
					<>
						<AudioPlayerFill />
						<AudioPlayerThumb />
					</>
				)}

				{showTooltip && hoverX !== null && duration > 0 && (
					<div
						className="absolute -top-7 -translate-x-1/2 px-1.5 py-0.5 rounded bg-foreground text-background text-[10px] font-mono tabular-nums shadow pointer-events-none z-30"
						style={{ left: `${hoverX}px` }}
					>
						{formatTime(hoverTime)}
					</div>
				)}
			</Comp>
		);
	})
);
AudioPlayerTrack.displayName = "AudioPlayerTrack";

const AudioPlayerSliderRoot = memo(
	forwardRef<"div", AudioPlayerSliderProps>((props, ref) => {
		const {
			as: Comp = "div",
			className,
			children,
			showTime = true,
			showTooltip = true,
			showBuffered = true,
			trackClassName,
			progressClassName,
			thumbClassName,
			timePosition = "bottom",
			...restProps
		} = props;

		return (
			<Comp
				ref={ref}
				className={cn(
					"group flex flex-col gap-1 w-full select-none",
					className
				)}
				{...restProps}
			>
				{children ?? (
					<>
						<AudioPlayerTrack
							showTooltip={showTooltip}
							className={trackClassName}
						>
							<AudioPlayerFill
								showBuffered={showBuffered}
								progressClassName={progressClassName}
							/>
							<AudioPlayerThumb className={thumbClassName} />
						</AudioPlayerTrack>

						{showTime && timePosition === "bottom" && (
							<div className="flex items-center justify-between text-xs px-0.5">
								<AudioPlayerTime type="current" />
								<AudioPlayerTime type="duration" />
							</div>
						)}
					</>
				)}
			</Comp>
		);
	})
);
AudioPlayerSliderRoot.displayName = "AudioPlayerSliderRoot";

export const AudioPlayerSlider = Object.assign(AudioPlayerSliderRoot, {
	Root: AudioPlayerSliderRoot,
	Track: AudioPlayerTrack,
	Fill: AudioPlayerFill,
	Thumb: AudioPlayerThumb,
	Output: AudioPlayerTime,
});
