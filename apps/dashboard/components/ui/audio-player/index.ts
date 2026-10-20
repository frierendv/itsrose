// follow heroui anatomy
export { AudioPlayer } from "./audio-player";

export { AudioPlayerRoot } from "./audio-player-root";

export { AudioPlayerControl } from "./audio-player-control";

export {
	AudioPlayerSlider,
	AudioPlayerTrack,
	AudioPlayerFill,
	AudioPlayerThumb,
} from "./audio-player-slider";

export { AudioPlayerTime, formatTime } from "./audio-player-time";

export { AudioPlayerVolume } from "./audio-player-volume";
export { AudioPlayerSkip } from "./audio-player-skip";

// Context & Hook exports
export {
	AudioPlayerContext,
	AudioPlayerProvider,
	useAudioPlayerContext,
} from "./context";

export { useAudioPlayer } from "./use-audio-player";

// Types
export type * from "./types";
