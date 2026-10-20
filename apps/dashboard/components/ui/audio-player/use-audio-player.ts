"use client";

import { useControlledState } from "@react-stately/utils";
import { useCallback, useEffect, useRef, useState } from "react";
import type { AudioPlayerContextValue, UseAudioPlayerProps } from "./types";

export function useAudioPlayer(
	props: UseAudioPlayerProps = {}
): AudioPlayerContextValue {
	const {
		src,
		isPlaying: isPlayingProp,
		isDefaultPlaying = false,
		defaultVolume = 1,
		defaultMuted = false,
		defaultPlaybackRate = 1,
		loop = false,
		preload = "metadata",
		onPlayingChange,
		onTimeUpdate,
		onDurationChange,
		onProgressChange,
		onVolumeChange,
		onEnded,
		onError,
	} = props;

	const audioRef = useRef<HTMLAudioElement | null>(null);

	// Ref mirrors to avoid re-triggering effects when callbacks change
	const onTimeUpdateRef = useRef(onTimeUpdate);
	const onDurationChangeRef = useRef(onDurationChange);
	const onProgressChangeRef = useRef(onProgressChange);
	const onVolumeChangeRef = useRef(onVolumeChange);
	const onEndedRef = useRef(onEnded);
	const onErrorRef = useRef(onError);

	// Scrubbing state (dragging the progress bar)
	const [isScrubbing, setIsScrubbing] = useState<boolean>(false);
	const isScrubbingRef = useRef(isScrubbing);

	// Update ref mirrors after render
	useEffect(() => {
		onTimeUpdateRef.current = onTimeUpdate;
		onDurationChangeRef.current = onDurationChange;
		onProgressChangeRef.current = onProgressChange;
		onVolumeChangeRef.current = onVolumeChange;
		onEndedRef.current = onEnded;
		onErrorRef.current = onError;
		isScrubbingRef.current = isScrubbing;
	});

	// Playback controlled state
	const [isPlaying, setIsPlayingControlled] = useControlledState(
		isPlayingProp,
		isDefaultPlaying,
		onPlayingChange
	);

	// Player status
	const [isReady, setIsReady] = useState<boolean>(false);
	const [isBuffering, setIsBuffering] = useState<boolean>(false);
	const [hasError, setHasError] = useState<boolean>(false);
	const [error, setError] = useState<MediaError | null>(null);

	// Timing state
	const [currentTime, setCurrentTimeState] = useState<number>(0);
	const [duration, setDurationState] = useState<number>(0);
	const [progress, setProgressState] = useState<number>(0);
	const [buffered, setBuffered] = useState<number>(0);

	// Volume & rate
	const [volume, setVolumeState] = useState<number>(defaultVolume);
	const [isMuted, setIsMuted] = useState<boolean>(defaultMuted);
	const [playbackRate, setPlaybackRateState] =
		useState<number>(defaultPlaybackRate);

	// Stable setter helpers
	const setCurrentTime = useCallback((time: number) => {
		setCurrentTimeState(time);
		onTimeUpdateRef.current?.(time);
	}, []);

	const setDuration = useCallback((newDuration: number) => {
		const safeDuration =
			isFinite(newDuration) && !isNaN(newDuration) ? newDuration : 0;
		setDurationState(safeDuration);
		onDurationChangeRef.current?.(safeDuration);
	}, []);

	const setProgress = useCallback((newProgress: number) => {
		const clamped = Math.min(Math.max(newProgress, 0), 100);
		setProgressState(clamped);
		onProgressChangeRef.current?.(clamped);
	}, []);

	// Play action
	const play = useCallback(async () => {
		const audio = audioRef.current;
		if (!audio) {
			return;
		}

		try {
			setIsPlayingControlled(true);
			await audio.play();
		} catch (err: unknown) {
			if (err instanceof DOMException && err.name === "AbortError") {
				return;
			}
			setIsPlayingControlled(false);
		}
	}, [setIsPlayingControlled]);

	// Pause action
	const pause = useCallback(() => {
		const audio = audioRef.current;
		if (!audio) {
			return;
		}

		audio.pause();
		setIsPlayingControlled(false);
	}, [setIsPlayingControlled]);

	// Toggle play/pause
	const togglePlay = useCallback(() => {
		if (isPlaying) {
			pause();
		} else {
			void play();
		}
	}, [isPlaying, pause, play]);

	// Seek to absolute time in seconds
	const seek = useCallback(
		(timeInSeconds: number) => {
			const audio = audioRef.current;
			if (!audio) {
				return;
			}

			const targetDuration = duration || audio.duration || 0;
			const safeTime = Math.min(
				Math.max(0, timeInSeconds),
				targetDuration > 0 ? targetDuration : timeInSeconds
			);

			audio.currentTime = safeTime;
			setCurrentTimeState(safeTime);
			onTimeUpdateRef.current?.(safeTime);

			if (targetDuration > 0) {
				const pct = (safeTime / targetDuration) * 100;
				setProgressState(pct);
				onProgressChangeRef.current?.(pct);
			}
		},
		[duration]
	);

	// Seek to percentage (0 - 100)
	const seekPercent = useCallback(
		(percentage: number) => {
			const clamped = Math.min(Math.max(percentage, 0), 100);
			const targetDuration = duration || audioRef.current?.duration || 0;
			if (targetDuration > 0) {
				seek((clamped / 100) * targetDuration);
			} else {
				setProgress(clamped);
			}
		},
		[duration, seek, setProgress]
	);

	// Skip by delta seconds (+/-)
	const skip = useCallback(
		(deltaSeconds: number) => {
			const current = audioRef.current?.currentTime ?? currentTime;
			seek(current + deltaSeconds);
		},
		[currentTime, seek]
	);

	// Volume control
	const setVolume = useCallback((newVolume: number) => {
		const clamped = Math.min(Math.max(newVolume, 0), 1);
		setVolumeState(clamped);

		if (audioRef.current) {
			audioRef.current.volume = clamped;
		}

		const shouldMute = clamped === 0;
		setIsMuted(shouldMute);
		if (audioRef.current) {
			audioRef.current.muted = shouldMute;
		}

		onVolumeChangeRef.current?.(clamped, shouldMute);
	}, []);

	// Mute toggle
	const toggleMute = useCallback(() => {
		setIsMuted((prev) => {
			const nextMuted = !prev;
			if (audioRef.current) {
				audioRef.current.muted = nextMuted;
			}
			onVolumeChangeRef.current?.(volume, nextMuted);
			return nextMuted;
		});
	}, [volume]);

	// Playback rate
	const setPlaybackRate = useCallback((rate: number) => {
		const safeRate = Math.max(0.25, Math.min(rate, 4));
		setPlaybackRateState(safeRate);
		if (audioRef.current) {
			audioRef.current.playbackRate = safeRate;
		}
	}, []);

	// Sync controlled prop changes to HTML audio element
	useEffect(() => {
		const audio = audioRef.current;
		if (!audio) {
			return;
		}

		if (isPlayingProp !== undefined) {
			if (isPlayingProp && audio.paused) {
				audio.play().catch(() => {});
			} else if (!isPlayingProp && !audio.paused) {
				audio.pause();
			}
		}
	}, [isPlayingProp]);

	// Sync volume and mute properties
	useEffect(() => {
		const audio = audioRef.current;
		if (!audio) {
			return;
		}
		audio.volume = volume;
		audio.muted = isMuted;
	}, [volume, isMuted]);

	// Sync rate and loop properties
	useEffect(() => {
		const audio = audioRef.current;
		if (!audio) {
			return;
		}
		audio.playbackRate = playbackRate;
		audio.loop = loop;
		if (preload) {
			audio.preload = preload;
		}
	}, [playbackRate, loop, preload]);

	// Wire audio element lifecycle event listeners
	useEffect(() => {
		const audio = audioRef.current;
		if (!audio) {
			return;
		}

		const handleLoadStart = () => {
			setCurrentTimeState(0);
			setProgressState(0);
			setBuffered(0);
			setIsReady(false);
			setHasError(false);
			setError(null);
		};

		const handleLoadedMetadata = () => {
			const dur = audio.duration;
			if (isFinite(dur) && !isNaN(dur)) {
				setDurationState(dur);
				onDurationChangeRef.current?.(dur);
			}
			setIsReady(true);
			setHasError(false);
			setError(null);
		};

		const handleDurationChange = () => {
			const dur = audio.duration;
			if (isFinite(dur) && !isNaN(dur)) {
				setDurationState(dur);
				onDurationChangeRef.current?.(dur);
			}
		};

		const handleTimeUpdateInternal = () => {
			if (isScrubbingRef.current) {
				return;
			}

			const current = audio.currentTime;
			setCurrentTimeState(current);
			onTimeUpdateRef.current?.(current);

			const dur = audio.duration;
			if (isFinite(dur) && dur > 0) {
				const pct = (current / dur) * 100;
				setProgressState(pct);
				onProgressChangeRef.current?.(pct);
			}
		};

		const handleProgress = () => {
			if (audio.buffered.length > 0 && audio.duration > 0) {
				const bufferedEnd = audio.buffered.end(
					audio.buffered.length - 1
				);
				const pct = (bufferedEnd / audio.duration) * 100;
				setBuffered(Math.min(Math.max(pct, 0), 100));
			}
		};

		const handlePlay = () => {
			setIsPlayingControlled(true);
			setIsBuffering(false);
		};

		const handlePause = () => {
			setIsPlayingControlled(false);
		};

		const handleWaiting = () => {
			setIsBuffering(true);
		};

		const handlePlaying = () => {
			setIsBuffering(false);
		};

		const handleEnded = () => {
			setIsPlayingControlled(false);
			setIsBuffering(false);
			onEndedRef.current?.();
		};

		const handleError = () => {
			setIsPlayingControlled(false);
			setIsBuffering(false);
			setHasError(true);
			const err = audio.error;
			setError(err);
			onErrorRef.current?.(err);
		};

		audio.addEventListener("loadstart", handleLoadStart);
		audio.addEventListener("loadedmetadata", handleLoadedMetadata);
		audio.addEventListener("durationchange", handleDurationChange);
		audio.addEventListener("timeupdate", handleTimeUpdateInternal);
		audio.addEventListener("progress", handleProgress);
		audio.addEventListener("play", handlePlay);
		audio.addEventListener("pause", handlePause);
		audio.addEventListener("waiting", handleWaiting);
		audio.addEventListener("playing", handlePlaying);
		audio.addEventListener("ended", handleEnded);
		audio.addEventListener("error", handleError);

		// If metadata is already loaded (e.g. cached audio or ready)
		if (audio.readyState >= 1) {
			handleLoadedMetadata();
		}

		return () => {
			audio.removeEventListener("loadstart", handleLoadStart);
			audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
			audio.removeEventListener("durationchange", handleDurationChange);
			audio.removeEventListener("timeupdate", handleTimeUpdateInternal);
			audio.removeEventListener("progress", handleProgress);
			audio.removeEventListener("play", handlePlay);
			audio.removeEventListener("pause", handlePause);
			audio.removeEventListener("waiting", handleWaiting);
			audio.removeEventListener("playing", handlePlaying);
			audio.removeEventListener("ended", handleEnded);
			audio.removeEventListener("error", handleError);
		};
	}, [audioRef, setIsPlayingControlled, src]);

	return {
		// State
		src,
		isPlaying,
		isReady,
		isBuffering,
		hasError,
		error,
		currentTime,
		duration,
		progress,
		buffered,
		volume,
		isMuted,
		playbackRate,
		isScrubbing,

		// Actions
		play,
		pause,
		togglePlay,
		seek,
		seekPercent,
		skip,
		setVolume,
		toggleMute,
		setPlaybackRate,
		setIsScrubbing,

		// Setters
		setProgress,
		setCurrentTime,
		setDuration,
		setIsPlaying: setIsPlayingControlled,

		// Ref
		audioRef,
	};
}
