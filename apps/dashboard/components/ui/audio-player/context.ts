"use client";

import { createContext } from "@itsrose/react";
import type { AudioPlayerContextValue } from "./types";

export const [AudioPlayerProvider, useAudioPlayerContext, AudioPlayerContext] =
	createContext<AudioPlayerContextValue>({
		name: "AudioPlayer",
		errorMessage:
			"useAudioPlayerContext must be used within an <AudioPlayer /> component",
	});
