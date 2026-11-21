"use client";

import { createContext, useContext } from "react";

/** One track the global audio player can play. */
export type AudioTrack = {
	/** The playable URL. Calling `play` with a new `src` replaces the source. */
	src: string;
	title: string;
	subtitle?: string;
	/** Optional cover art, rendered as the player's artwork. */
	coverUrl?: string;
};

/** The state and actions available through {@link useAudioPlayer}. */
export type AudioPlayerContextValue = {
	/** The loaded track, or `null` while the player is closed. */
	track: AudioTrack | null;
	isPlaying: boolean;
	/** The playback position in seconds. */
	currentTime: number;
	/** The track length in seconds; `0` until the metadata loads. */
	duration: number;
	isMinimized: boolean;
	/** Replaces the source with `track` and starts playback. */
	play: (track: AudioTrack) => void;
	/** Pauses a playing track, or resumes a paused one. */
	toggle: () => void;
	/** Moves the playback position, clamped to `[0, duration]`. */
	seek: (seconds: number) => void;
	minimize: () => void;
	expand: () => void;
	/** Stops playback, clears the source and hides the player. */
	close: () => void;
};

export const AudioPlayerContext = createContext<AudioPlayerContextValue | null>(
	null
);

AudioPlayerContext.displayName = "AudioPlayerContext";

/**
 * Reads the global audio player mounted by `AudioPlayerProvider`.
 *
 * @throws A clear error when the component is rendered outside the provider,
 * which is always a wiring mistake rather than a recoverable condition.
 */
export function useAudioPlayer(): AudioPlayerContextValue {
	const context = useContext(AudioPlayerContext);

	if (!context) {
		throw new Error(
			"useAudioPlayer must be used within an AudioPlayerProvider. Mount the provider in the dashboard's provider tree."
		);
	}

	return context;
}
