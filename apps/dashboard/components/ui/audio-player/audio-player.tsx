"use client";

import {
	ArrowRotateLeft,
	ArrowRotateRight,
	ChevronDown,
	ChevronUp,
	MusicNote,
	Pause,
	Play,
	Xmark,
} from "@gravity-ui/icons";
import { Button, Slider, Typography } from "@heroui/react";
import { cn } from "@itsrose/react/core";
import { formatPlaybackTime } from "./format-playback-time";
import { useAudioPlayer } from "./use-audio-player";

/** The progress of `current` through `total`, clamped to `0–100`. */
function progressPercent(current: number, total: number): number {
	if (!Number.isFinite(current) || !Number.isFinite(total) || total <= 0) {
		return 0;
	}

	return Math.min(100, Math.max(0, (current / total) * 100));
}

/**
 * The global floating player.
 *
 * Its wrapper covers the bottom of the viewport but does not take pointer
 * events, so only the bar itself is interactive and the page underneath stays
 * usable. The player renders nothing until a track is playing, and collapses
 * to a slim progress bar while minimized.
 */
export const AudioPlayer: React.FC = () => {
	const {
		track,
		isPlaying,
		currentTime,
		duration,
		isMinimized,
		toggle,
		seek,
		minimize,
		expand,
		close,
	} = useAudioPlayer();

	if (!track) {
		return null;
	}

	const progress = progressPercent(currentTime, duration);
	const maximum = duration > 0 ? duration : 1;

	const handleSeek = (next: number | number[]) => {
		seek(Array.isArray(next) ? (next[0] ?? 0) : next);
	};

	return (
		<div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
			{isMinimized ? (
				<button
					type="button"
					aria-label="Expand audio player"
					className="pointer-events-auto flex w-full max-w-md items-center gap-2 rounded-full border border-separator bg-background/90 p-2 shadow-lg backdrop-blur"
					onClick={expand}
				>
					<span className="relative h-1 flex-1 overflow-hidden rounded-full bg-surface-secondary">
						<span
							aria-hidden
							className="absolute inset-y-0 left-0 rounded-full bg-accent"
							style={{ width: `${progress}%` }}
						/>
					</span>
					<ChevronUp
						aria-hidden
						className="size-4 shrink-0 text-muted"
					/>
				</button>
			) : (
				<section
					aria-label="Audio player"
					className={cn(
						"pointer-events-auto flex w-full max-w-md flex-col gap-3 rounded-2xl border border-separator bg-background/90 p-3 shadow-xl backdrop-blur",
						isPlaying && "border-accent/40"
					)}
				>
					<div className="flex items-center gap-3">
						<span
							aria-hidden
							className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface-secondary bg-cover bg-center text-muted"
							style={
								track.coverUrl
									? {
											backgroundImage: `url(${track.coverUrl})`,
										}
									: undefined
							}
						>
							{track.coverUrl ? null : (
								<MusicNote className="size-5" />
							)}
						</span>

						<div className="min-w-0 flex-1">
							<Typography
								type="body-sm"
								className="truncate font-medium"
							>
								{track.title}
							</Typography>
							{track.subtitle ? (
								<Typography
									type="body-xs"
									color="muted"
									className="truncate"
								>
									{track.subtitle}
								</Typography>
							) : null}
						</div>

						<Button
							isIconOnly
							aria-label="Minimize audio player"
							size="sm"
							variant="ghost"
							onPress={minimize}
						>
							<ChevronDown aria-hidden className="size-4" />
						</Button>
						<Button
							isIconOnly
							aria-label="Close audio player"
							size="sm"
							variant="ghost"
							onPress={close}
						>
							<Xmark aria-hidden className="size-4" />
						</Button>
					</div>

					<div className="flex items-center gap-3">
						<Typography
							type="body-xs"
							color="muted"
							className="w-10 shrink-0 tabular-nums"
						>
							{formatPlaybackTime(currentTime)}
						</Typography>

						<Slider
							aria-label="Seek"
							className="flex-1"
							isDisabled={duration <= 0}
							maxValue={maximum}
							minValue={0}
							step={0.1}
							value={Math.min(currentTime, maximum)}
							onChange={handleSeek}
						>
							<Slider.Track>
								<Slider.Fill />
								<Slider.Thumb />
							</Slider.Track>
						</Slider>

						<Typography
							type="body-xs"
							color="muted"
							className="w-10 shrink-0 text-right tabular-nums"
						>
							{formatPlaybackTime(duration)}
						</Typography>
					</div>

					<div className="flex items-center justify-center gap-4">
						<Button
							aria-label="Rewind 10 seconds"
							isDisabled={duration <= 0}
							size="sm"
							variant="ghost"
							onPress={() => seek(currentTime - 10)}
						>
							<ArrowRotateLeft aria-hidden className="size-4" />
							<span className="text-xs font-medium">10</span>
						</Button>

						<Button
							isIconOnly
							aria-label={isPlaying ? "Pause" : "Play"}
							variant="primary"
							onPress={toggle}
						>
							{isPlaying ? (
								<Pause aria-hidden className="size-5" />
							) : (
								<Play aria-hidden className="size-5" />
							)}
						</Button>

						<Button
							aria-label="Forward 10 seconds"
							isDisabled={duration <= 0}
							size="sm"
							variant="ghost"
							onPress={() => seek(currentTime + 10)}
						>
							<span className="text-xs font-medium">10</span>
							<ArrowRotateRight aria-hidden className="size-4" />
						</Button>
					</div>
				</section>
			)}
		</div>
	);
};

AudioPlayer.displayName = "AudioPlayer";
