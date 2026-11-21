"use client";

import {
	ArrowDownToLine,
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

	const handleDownload = () => {
		if (!track) {
			return;
		}
		const cleanName =
			track.title.slice(0, 32).replace(/[^a-zA-Z0-9_-]/g, "_") || "audio";
		const anchor = document.createElement("a");
		anchor.href = track.src;
		anchor.download = `${cleanName}.mp3`;
		anchor.target = "_blank";
		document.body.append(anchor);
		anchor.click();
		anchor.remove();
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
						"pointer-events-auto flex w-full max-w-md flex-col gap-3 rounded-2xl border border-separator bg-background/95 p-3 shadow-2xl backdrop-blur md:max-w-4xl md:flex-row md:items-center md:gap-4 md:px-4 md:py-2.5",
						isPlaying && "border-accent/40"
					)}
				>
					{/* Left: Track Information */}
					<div className="flex items-center gap-3 min-w-0 md:w-56 md:shrink-0">
						<span
							aria-hidden
							className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-surface-secondary bg-cover bg-center text-muted"
							style={
								track.coverUrl
									? {
											backgroundImage: `url(${track.coverUrl})`,
										}
									: undefined
							}
						>
							{track.coverUrl ? null : (
								<MusicNote className="size-4" />
							)}
						</span>

						<div className="min-w-0 flex-1">
							<Typography
								type="body-sm"
								className="truncate font-medium text-xs md:text-sm"
							>
								{track.title}
							</Typography>
							{track.subtitle ? (
								<Typography
									type="body-xs"
									color="muted"
									className="truncate text-[11px]"
								>
									{track.subtitle}
								</Typography>
							) : null}
						</div>

						{/* Mobile minimize and close buttons */}
						<div className="flex items-center gap-1 md:hidden">
							<Button
								isIconOnly
								aria-label="Download audio"
								size="sm"
								variant="ghost"
								onPress={handleDownload}
							>
								<ArrowDownToLine
									aria-hidden
									className="size-4"
								/>
							</Button>
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
					</div>

					{/* Center: Playback Controls & Scrubber */}
					<div className="flex flex-1 items-center gap-2 md:gap-3">
						<Button
							aria-label="Rewind 10 seconds"
							isDisabled={duration <= 0}
							size="sm"
							variant="ghost"
							className="h-8 px-2"
							onPress={() => seek(currentTime - 10)}
						>
							<ArrowRotateLeft aria-hidden className="size-3.5" />
							<span className="text-[11px] font-medium">10</span>
						</Button>

						<Button
							isIconOnly
							aria-label={isPlaying ? "Pause" : "Play"}
							variant="primary"
							size="sm"
							className="size-8 min-w-8"
							onPress={toggle}
						>
							{isPlaying ? (
								<Pause aria-hidden className="size-4" />
							) : (
								<Play aria-hidden className="size-4" />
							)}
						</Button>

						<Button
							aria-label="Forward 10 seconds"
							isDisabled={duration <= 0}
							size="sm"
							variant="ghost"
							className="h-8 px-2"
							onPress={() => seek(currentTime + 10)}
						>
							<span className="text-[11px] font-medium">10</span>
							<ArrowRotateRight
								aria-hidden
								className="size-3.5"
							/>
						</Button>

						<Typography
							type="body-xs"
							color="muted"
							className="w-9 shrink-0 text-right tabular-nums text-[11px]"
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
							className="w-9 shrink-0 text-left tabular-nums text-[11px]"
						>
							{formatPlaybackTime(duration)}
						</Typography>
					</div>

					{/* Desktop minimize and close buttons */}
					<div className="hidden items-center gap-1 md:flex md:shrink-0">
						<Button
							isIconOnly
							aria-label="Download audio"
							size="sm"
							variant="ghost"
							onPress={handleDownload}
						>
							<ArrowDownToLine aria-hidden className="size-4" />
						</Button>
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
				</section>
			)}
		</div>
	);
};

AudioPlayer.displayName = "AudioPlayer";
