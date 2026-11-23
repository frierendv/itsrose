"use client";

import type { PropsWithChildren } from "react";
import { useCallback, useMemo, useRef, useState } from "react";
import { AudioPlayer } from "./audio-player";
import {
	AudioPlayerContext,
	type AudioPlayerContextValue,
	type AudioTrack,
} from "./use-audio-player";

/**
 * Starts playback without leaking an unhandled promise rejection.
 *
 * A rejected `play()` (an unsupported format, or the browser's autoplay
 * policy) leaves the element paused, and the resulting `pause` event already
 * updates the UI. The rejection still has to be caught.
 */
function startPlayback(audio: HTMLAudioElement): void {
	try {
		Promise.resolve(audio.play()).catch(() => undefined);
	} catch {
		// The element reports its failure through its events instead.
	}
}

/**
 * Owns the single `<audio>` element shared by the dashboard and renders the
 * floating player next to the page content.
 *
 * Page code never touches the element: it calls {@link useAudioPlayer} to
 * start a track and read the playback state.
 */
export const AudioPlayerProvider: React.FC<PropsWithChildren> = ({
	children,
}) => {
	const audioRef = useRef<HTMLAudioElement>(null);
	const [track, setTrack] = useState<AudioTrack | null>(null);
	const [isPlaying, setIsPlaying] = useState(false);
	const [currentTime, setCurrentTime] = useState(0);
	const [duration, setDuration] = useState(0);
	const [isMinimized, setIsMinimized] = useState(false);

	const play = useCallback(
		(next: AudioTrack) => {
			const audio = audioRef.current;
			if (!audio) {
				return;
			}

			const isNewSource = track?.src !== next.src;
			setTrack(next);

			if (isNewSource) {
				setCurrentTime(0);
				setDuration(0);
				audio.src = next.src;
				audio.load();
			}

			startPlayback(audio);
		},
		[track]
	);

	const toggle = useCallback(() => {
		const audio = audioRef.current;
		if (!audio || !track) {
			return;
		}

		if (audio.paused) {
			startPlayback(audio);
		} else {
			audio.pause();
		}
	}, [track]);

	const seek = useCallback(
		(seconds: number) => {
			const audio = audioRef.current;
			if (!audio) {
				return;
			}

			const loadedDuration =
				Number.isFinite(audio.duration) && audio.duration > 0
					? audio.duration
					: duration;
			const upperBound = loadedDuration > 0 ? loadedDuration : 0;
			const next = Math.min(Math.max(seconds, 0), upperBound);

			audio.currentTime = next;
			setCurrentTime(next);
		},
		[duration]
	);

	const minimize = useCallback(() => setIsMinimized(true), []);
	const expand = useCallback(() => setIsMinimized(false), []);

	const close = useCallback(() => {
		const audio = audioRef.current;
		if (audio) {
			audio.pause();
			audio.removeAttribute("src");
			audio.load();
		}

		setTrack(null);
		setIsPlaying(false);
		setCurrentTime(0);
		setDuration(0);
		setIsMinimized(false);
	}, []);

	const value = useMemo<AudioPlayerContextValue>(
		() => ({
			track,
			isPlaying,
			currentTime,
			duration,
			isMinimized,
			play,
			toggle,
			seek,
			minimize,
			expand,
			close,
		}),
		[
			track,
			isPlaying,
			currentTime,
			duration,
			isMinimized,
			play,
			toggle,
			seek,
			minimize,
			expand,
			close,
		]
	);

	return (
		<AudioPlayerContext.Provider value={value}>
			{children}
			<audio
				ref={audioRef}
				className="hidden"
				preload="metadata"
				onEnded={(event) => {
					setIsPlaying(false);
					const endedAt = event.currentTarget.duration;
					setCurrentTime(Number.isFinite(endedAt) ? endedAt : 0);
				}}
				onLoadedMetadata={(event) => {
					const loaded = event.currentTarget.duration;
					setDuration(Number.isFinite(loaded) ? loaded : 0);
				}}
				onPause={() => setIsPlaying(false)}
				onPlay={() => setIsPlaying(true)}
				onTimeUpdate={(event) => {
					setCurrentTime(event.currentTarget.currentTime);
				}}
			/>
			<AudioPlayer />
		</AudioPlayerContext.Provider>
	);
};

AudioPlayerProvider.displayName = "AudioPlayerProvider";
