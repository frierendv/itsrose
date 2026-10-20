import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { HistoryItem, VoiceSettings } from "../api/types";
import {
	DEFAULT_VOICE_SETTINGS,
	VOICE_SETTING_PRESETS,
	type VoiceSettingPresetKey,
} from "./constants";

export type TTSState = {
	// Prompt
	text: string;
	setText: (text: string) => void;

	// Selections
	selectedVoiceId: string | null;
	setSelectedVoiceId: (id: string | null) => void;
	selectedModelId: string | null;
	setSelectedModelId: (id: string | null) => void;
	characterLimit: number;
	setCharacterLimit: (limit: number) => void;

	// Voice Settings
	voiceSettings: VoiceSettings;
	updateVoiceSettings: (settings: Partial<VoiceSettings>) => void;
	resetVoiceSettings: () => void;
	applyPreset: (preset: VoiceSettingPresetKey) => void;

	// History & Active Output
	history: HistoryItem[];
	addToHistory: (item: HistoryItem) => void;
	removeHistoryItem: (id: string) => void;
	clearHistory: () => void;
	activeAudio: HistoryItem | null;
	setActiveAudio: (item: HistoryItem | null) => void;

	// Voice Preview Audio Player
	previewSrc: string | null;
	isPreviewPlaying: boolean;
	isPreviewPending: boolean;
	playPreview: (src: string) => void;
	pausePreview: () => void;
	stopPreview: () => void;
	togglePreview: (src: string) => void;
};

// Client-only singleton Audio instance for voice previews
let previewAudio: HTMLAudioElement | null = null;
let activeAudioSrc: string | null = null;

function getPreviewAudio(
	set: (fn: (state: TTSState) => Partial<TTSState>) => void
) {
	if (typeof window === "undefined") {
		return null;
	}

	if (!previewAudio) {
		const audio = new Audio();
		audio.preload = "auto";

		audio.addEventListener("waiting", () => {
			set(() => ({ isPreviewPending: true }));
		});

		audio.addEventListener("canplay", () => {
			set(() => ({ isPreviewPending: false }));
		});

		audio.addEventListener("playing", () => {
			set(() => ({ isPreviewPlaying: true, isPreviewPending: false }));
		});

		audio.addEventListener("ended", () => {
			if (audio.readyState > 0) {
				audio.currentTime = 0;
			}
			activeAudioSrc = null;
			set(() => ({
				previewSrc: null,
				isPreviewPlaying: false,
				isPreviewPending: false,
			}));
		});

		audio.addEventListener("error", () => {
			if (audio.readyState > 0) {
				audio.currentTime = 0;
			}
			activeAudioSrc = null;
			set(() => ({
				previewSrc: null,
				isPreviewPlaying: false,
				isPreviewPending: false,
			}));
		});

		previewAudio = audio;
	}

	return previewAudio;
}

export const useTTSStore = create<TTSState>()(
	persist(
		(set, get) => ({
			// Prompt
			text: "",
			setText: (text) => set({ text }),

			// Selections
			selectedVoiceId: null,
			setSelectedVoiceId: (selectedVoiceId) => set({ selectedVoiceId }),
			selectedModelId: null,
			setSelectedModelId: (selectedModelId) => set({ selectedModelId }),
			characterLimit: 5000,
			setCharacterLimit: (characterLimit) => set({ characterLimit }),

			// Voice Settings
			voiceSettings: DEFAULT_VOICE_SETTINGS,
			updateVoiceSettings: (settings) =>
				set((state) => ({
					voiceSettings: { ...state.voiceSettings, ...settings },
				})),
			resetVoiceSettings: () =>
				set({ voiceSettings: DEFAULT_VOICE_SETTINGS }),
			applyPreset: (presetKey) => {
				const preset = VOICE_SETTING_PRESETS[presetKey];
				if (preset) {
					set({ voiceSettings: preset.settings });
				}
			},

			// History & Active Output
			history: [],
			addToHistory: (item) =>
				set((state) => ({
					history: [
						item,
						...state.history.filter((h) => h.id !== item.id),
					].slice(0, 50),
				})),
			removeHistoryItem: (id) =>
				set((state) => ({
					history: state.history.filter((h) => h.id !== id),
					activeAudio:
						state.activeAudio?.id === id ? null : state.activeAudio,
				})),
			clearHistory: () => set({ history: [], activeAudio: null }),
			activeAudio: null,
			setActiveAudio: (activeAudio) => set({ activeAudio }),

			// Voice Preview
			previewSrc: null,
			isPreviewPlaying: false,
			isPreviewPending: false,

			playPreview: (src: string) => {
				if (!src) {
					return;
				}

				const audio = getPreviewAudio(set);
				if (!audio) {
					return;
				}

				// If switching to a new audio track
				if (activeAudioSrc !== src) {
					audio.pause();
					if (audio.readyState > 0) {
						audio.currentTime = 0;
					}
					audio.src = src;
					activeAudioSrc = src;
				}

				set({
					previewSrc: src,
					isPreviewPlaying: true,
					isPreviewPending: true,
				});

				audio.play().catch((err: unknown) => {
					// Ignore AbortError when play() is interrupted by pause()
					if (
						err instanceof DOMException &&
						err.name === "AbortError"
					) {
						return;
					}
					activeAudioSrc = null;
					set({
						previewSrc: null,
						isPreviewPlaying: false,
						isPreviewPending: false,
					});
				});
			},

			pausePreview: () => {
				const audio = getPreviewAudio(set);
				if (audio) {
					audio.pause();
				}
				set({ isPreviewPlaying: false, isPreviewPending: false });
			},

			stopPreview: () => {
				const audio = getPreviewAudio(set);
				if (audio) {
					audio.pause();
					if (audio.readyState > 0) {
						audio.currentTime = 0;
					}
				}
				activeAudioSrc = null;
				set({
					previewSrc: null,
					isPreviewPlaying: false,
					isPreviewPending: false,
				});
			},

			togglePreview: (src: string) => {
				const { previewSrc, isPreviewPlaying, isPreviewPending } =
					get();
				if (
					previewSrc === src &&
					(isPreviewPlaying || isPreviewPending)
				) {
					get().pausePreview();
				} else {
					get().playPreview(src);
				}
			},
		}),
		{
			name: "itsrose-tts-state",
			storage: createJSONStorage(() => sessionStorage),
			partialize: (state) => ({
				text: state.text,
				selectedVoiceId: state.selectedVoiceId,
				selectedModelId: state.selectedModelId,
				voiceSettings: state.voiceSettings,
				history: state.history,
			}),
		}
	)
);
