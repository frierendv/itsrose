"use client";

import type { ComponentProps } from "react";
import { AudioPlayerControl } from "./audio-player-control";
import { AudioPlayerRoot } from "./audio-player-root";
import { AudioPlayerSkip } from "./audio-player-skip";
import {
	AudioPlayerFill,
	AudioPlayerSlider,
	AudioPlayerThumb,
	AudioPlayerTrack,
} from "./audio-player-slider";
import { AudioPlayerTime } from "./audio-player-time";
import { AudioPlayerVolume } from "./audio-player-volume";

export const AudioPlayer = Object.assign(AudioPlayerRoot, {
	Root: AudioPlayerRoot,
	Control: AudioPlayerControl,
	PlayButton: AudioPlayerControl,
	Slider: AudioPlayerSlider,
	Progress: AudioPlayerSlider,
	Track: AudioPlayerTrack,
	Fill: AudioPlayerFill,
	Thumb: AudioPlayerThumb,
	Time: AudioPlayerTime,
	Output: AudioPlayerTime,
	Volume: AudioPlayerVolume,
	Skip: AudioPlayerSkip,
});

export type AudioPlayer = {
	Props: ComponentProps<typeof AudioPlayerRoot>;
	RootProps: ComponentProps<typeof AudioPlayerRoot>;
	Control: ComponentProps<typeof AudioPlayerControl>;
	PlayButton: ComponentProps<typeof AudioPlayerControl>;
	Slider: ComponentProps<typeof AudioPlayerSlider>;
	Progress: ComponentProps<typeof AudioPlayerSlider>;
	Track: ComponentProps<typeof AudioPlayerTrack>;
	Fill: ComponentProps<typeof AudioPlayerFill>;
	Thumb: ComponentProps<typeof AudioPlayerThumb>;
	Time: ComponentProps<typeof AudioPlayerTime>;
	Output: ComponentProps<typeof AudioPlayerTime>;
	Volume: ComponentProps<typeof AudioPlayerVolume>;
	Skip: ComponentProps<typeof AudioPlayerSkip>;
};
