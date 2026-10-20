import type { Button } from "@heroui/react/button";
import type { HTMLMotionProps } from "motion/react";
import type { ComponentProps, RefObject } from "react";

export type AudioButtonVariant = ComponentProps<typeof Button>["variant"];
export type AudioButtonSize = ComponentProps<typeof Button>["size"];

export type AudioTimeFormat = "current" | "duration" | "remaining" | "total";

export type AudioPlayerState = {
	/** Current source URL */
	src?: string;
	/** Whether the audio is currently playing */
	isPlaying: boolean;
	/** Whether the audio element is ready to play */
	isReady: boolean;
	/** Whether the audio is waiting for data (buffering) */
	isBuffering: boolean;
	/** Whether playback encountered an error */
	hasError: boolean;
	/** Current playback error, if any */
	error: MediaError | null;
	/** Current playback position in seconds */
	currentTime: number;
	/** Total track duration in seconds */
	duration: number;
	/** Playback progress as a percentage (0 - 100) */
	progress: number;
	/** Buffer progress as a percentage (0 - 100) */
	buffered: number;
	/** Playback volume (0 - 1) */
	volume: number;
	/** Whether audio is currently muted */
	isMuted: boolean;
	/** Current playback rate (e.g. 1, 1.5, 2) */
	playbackRate: number;
	/** Whether the user is currently dragging/scrubbing the progress bar */
	isScrubbing: boolean;
};

export type AudioPlayerActions = {
	/** Start audio playback */
	play: () => Promise<void>;
	/** Pause audio playback */
	pause: () => void;
	/** Toggle play / pause */
	togglePlay: () => void;
	/** Seek to a specific timestamp in seconds */
	seek: (timeInSeconds: number) => void;
	/** Seek to a specific percentage (0 - 100) */
	seekPercent: (percentage: number) => void;
	/** Skip forward or backward by a delta in seconds */
	skip: (deltaSeconds: number) => void;
	/** Set playback volume (0 to 1) */
	setVolume: (volume: number) => void;
	/** Toggle mute */
	toggleMute: () => void;
	/** Set playback speed rate */
	setPlaybackRate: (rate: number) => void;
	/** Set internal scrubbing state */
	setIsScrubbing: (isScrubbing: boolean) => void;
	/** Setters for audio element callbacks */
	setProgress: (progress: number) => void;
	setCurrentTime: (time: number) => void;
	setDuration: (duration: number) => void;
	setIsPlaying: (isPlaying: boolean | ((prev: boolean) => boolean)) => void;
};

export type AudioPlayerContextValue = AudioPlayerState &
	AudioPlayerActions & {
		/** Reference to the underlying HTMLAudioElement */
		audioRef: RefObject<HTMLAudioElement | null>;
	};

export type UseAudioPlayerProps = {
	/** Audio source URL */
	src?: string;
	/** Controlled playback state */
	isPlaying?: boolean;
	/** Default uncontrolled playback state */
	isDefaultPlaying?: boolean;
	/** Initial volume (0 to 1, default: 1) */
	defaultVolume?: number;
	/** Initial muted state (default: false) */
	defaultMuted?: boolean;
	/** Initial playback rate (default: 1) */
	defaultPlaybackRate?: number;
	/** Whether to loop playback when finished */
	loop?: boolean;
	/** Preload strategy */
	preload?: "none" | "metadata" | "auto";
	/** Callback when play/pause state changes */
	onPlayingChange?: (isPlaying: boolean) => void;
	/** Callback when current time updates */
	onTimeUpdate?: (currentTime: number) => void;
	/** Callback when duration is loaded or changed */
	onDurationChange?: (duration: number) => void;
	/** Callback when progress percentage changes */
	onProgressChange?: (progress: number) => void;
	/** Callback when volume or muted state changes */
	onVolumeChange?: (volume: number, isMuted: boolean) => void;
	/** Callback when audio reaches the end */
	onEnded?: () => void;
	/** Callback when audio loading fails */
	onError?: (error: MediaError | null) => void;
};

export type UseAudioPlayerReturn = AudioPlayerContextValue;

// Component Props

export type AudioPlayerRootProps = Omit<HTMLMotionProps<"div">, "children"> &
	UseAudioPlayerProps & {
		children?: React.ReactNode;
		/**
		 * If true, automatically renders the audio element if no `<AudioPlayer.Source />`
		 * child is provided. Defaults to true.
		 */
		autoRenderSource?: boolean;
	};

export type AudioPlayerControlProps = {
	/** Icon size in pixels (default: 20) */
	iconSize?: number;
	/** Display variant for the control button */
	variant?: AudioButtonVariant;
	/** Whether to show a spinner icon when audio is buffering */
	showBufferingIndicator?: boolean;
	/** Custom button size */
	size?: AudioButtonSize;
	/** Custom play icon */
	playIcon?: React.ReactNode;
	/** Custom pause icon */
	pauseIcon?: React.ReactNode;
};

export type AudioPlayerSliderProps = {
	children?: React.ReactNode;
	/** Whether to show elapsed and total duration timestamps below/beside track */
	showTime?: boolean;
	/** Position or layout of the time labels */
	timePosition?: "bottom" | "inline";
	/** Whether to show a hover tooltip displaying time at cursor */
	showTooltip?: boolean;
	/** Whether to show buffered progress track behind active progress */
	showBuffered?: boolean;
	/** Custom class name for the track bar */
	trackClassName?: string;
	/** Custom class name for the filled progress bar */
	progressClassName?: string;
	/** Custom class name for the thumb handle */
	thumbClassName?: string;
};

export type AudioPlayerTrackProps = {
	children?: React.ReactNode;
	/** Whether to show a hover tooltip displaying time at cursor */
	showTooltip?: boolean;
	/** Custom class name for the track */
	className?: string;
};

export type AudioPlayerFillProps = {
	/** Whether to show buffered progress track behind active progress */
	showBuffered?: boolean;
	/** Custom class name for the base track container */
	className?: string;
	/** Custom class name for the filled progress bar */
	progressClassName?: string;
	/** Custom class name for the buffered track bar */
	bufferedClassName?: string;
};

export type AudioPlayerThumbProps = {
	/** Custom class name for the thumb handle */
	className?: string;
};

export type AudioPlayerTimeProps = {
	/** Type of time to display */
	type?: AudioTimeFormat;
	/** Custom time formatter */
	format?: (seconds: number) => string;
};

export type AudioPlayerVolumeProps = {
	/** Variant of the mute button */
	buttonVariant?: AudioButtonVariant;
	/** Size of the volume control */
	size?: AudioButtonSize;
};

export type AudioPlayerSkipProps = {
	/** Amount of seconds to skip (positive to skip forward, negative to rewind) */
	seconds?: number;
	/** Direction for accessible labeling */
	direction?: "forward" | "backward";
	/** Button variant */
	variant?: AudioButtonVariant;
	/** Button size */
	size?: AudioButtonSize;
};
