/**
 * Formats a playback position as `m:ss`.
 *
 * Seconds are floored, so a position just before a minute reads `0:59`. A
 * negative or non-finite position (an audio element that has not loaded its
 * metadata yet reports `NaN`) reads `0:00` rather than `NaN:NaN`.
 *
 * @param seconds - The playback position in seconds.
 * @returns The position in `m:ss` form; minutes are not capped at 59.
 */
export function formatPlaybackTime(seconds: number): string {
	if (!Number.isFinite(seconds) || seconds < 0) {
		return "0:00";
	}

	const totalSeconds = Math.floor(seconds);
	const minutes = Math.floor(totalSeconds / 60);
	const remainder = totalSeconds % 60;

	return `${minutes}:${String(remainder).padStart(2, "0")}`;
}
