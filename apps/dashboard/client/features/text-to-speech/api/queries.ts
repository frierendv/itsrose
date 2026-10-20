"use client";

import { toast } from "@heroui/react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { useTTSStore } from "../store/use-tts-store";
import { fetchModels, fetchVoices, generateSpeech } from "./client";
import type { HistoryItem, Model } from "./types";

export const ttsQueryKeys = {
	all: ["elevenlabs-audio"] as const,
	models: () => [...ttsQueryKeys.all, "models"] as const,
	voices: (category: string) =>
		[...ttsQueryKeys.all, "voices", category] as const,
	generate: () => [...ttsQueryKeys.all, "generate"] as const,
};

export function useModels() {
	const selectedModelId = useTTSStore((s) => s.selectedModelId);
	const setSelectedModelId = useTTSStore((s) => s.setSelectedModelId);
	const setCharacterLimit = useTTSStore((s) => s.setCharacterLimit);

	const query = useQuery({
		queryKey: ttsQueryKeys.models(),
		queryFn: fetchModels,
		staleTime: 1000 * 60 * 30, // 30 mins
	});

	const ttsModels = useMemo(() => {
		if (!query.data) {
			return [];
		}
		return query.data
			.filter((m) => m.can_do_text_to_speech)
			.sort((a: Model, b: Model) => {
				if (a.model_id === "eleven_v3") {
					return -1;
				}
				if (b.model_id === "eleven_v3") {
					return 1;
				}
				return 0;
			});
	}, [query.data]);

	// Auto-select default model if none selected
	const activeModel = useMemo(() => {
		if (!ttsModels.length) {
			return undefined;
		}
		const found = ttsModels.find((m) => m.model_id === selectedModelId);
		if (found) {
			return found;
		}

		const fallback =
			ttsModels.find((m) => m.model_id === "eleven_multilingual_v2") ||
			ttsModels.find((m) => m.model_id === "eleven_v3") ||
			ttsModels[0];

		if (fallback && !selectedModelId) {
			setSelectedModelId(fallback.model_id);
			setCharacterLimit(fallback.maximum_text_length_per_request);
		}

		return fallback;
	}, [ttsModels, selectedModelId, setSelectedModelId, setCharacterLimit]);

	return {
		...query,
		models: ttsModels,
		allModels: query.data ?? [],
		activeModel,
	};
}

export function useVoices(category: string = "all") {
	const selectedVoiceId = useTTSStore((s) => s.selectedVoiceId);
	const setSelectedVoiceId = useTTSStore((s) => s.setSelectedVoiceId);

	const apiCategory = category === "all" ? "premade" : category;

	const query = useQuery({
		queryKey: ttsQueryKeys.voices(apiCategory),
		queryFn: () => fetchVoices({ category: apiCategory }),
		staleTime: 1000 * 60 * 30, // 30 mins
	});

	// Auto-select default voice if none selected
	const activeVoice = useMemo(() => {
		if (!query.data || query.data.length === 0) {
			return undefined;
		}
		const found = query.data.find((v) => v.voice_id === selectedVoiceId);
		if (found) {
			return found;
		}

		const fallback =
			query.data.find((v) => v.name.toLowerCase().includes("bella")) ||
			query.data.find((v) => v.name.toLowerCase().includes("george")) ||
			query.data[0];

		if (fallback && !selectedVoiceId) {
			setSelectedVoiceId(fallback.voice_id);
		}

		return fallback;
	}, [query.data, selectedVoiceId, setSelectedVoiceId]);

	return {
		...query,
		voices: query.data ?? [],
		activeVoice,
	};
}

export function useGenerateSpeech() {
	const text = useTTSStore((s) => s.text);
	const selectedVoiceId = useTTSStore((s) => s.selectedVoiceId);
	const selectedModelId = useTTSStore((s) => s.selectedModelId);
	const voiceSettings = useTTSStore((s) => s.voiceSettings);
	const characterLimit = useTTSStore((s) => s.characterLimit);
	const addToHistory = useTTSStore((s) => s.addToHistory);
	const setActiveAudio = useTTSStore((s) => s.setActiveAudio);

	const { activeVoice } = useVoices("all");
	const { activeModel } = useModels();

	const canGenerate = useMemo(() => {
		const hasValidText = text.trim().length > 0;
		const hasVoice = Boolean(selectedVoiceId);
		const withinLimit =
			characterLimit <= 0 || text.length <= characterLimit;
		return hasValidText && hasVoice && withinLimit;
	}, [text, selectedVoiceId, characterLimit]);

	const mutation = useMutation({
		mutationKey: ttsQueryKeys.generate(),
		mutationFn: async () => {
			if (!text.trim()) {
				throw new Error("Please enter text to synthesize.");
			}
			if (!selectedVoiceId) {
				throw new Error("Please select a voice.");
			}

			const response = await generateSpeech({
				text: text.trim(),
				voice_id: selectedVoiceId,
				model_id: selectedModelId || undefined,
				voice_settings: voiceSettings,
			});

			const fullAudioSrc = `data:audio/mp3;base64,${response.audio_base64}`;
			const historyItem: HistoryItem = {
				id: `tts-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
				timestamp: Date.now(),
				text: text.trim(),
				voiceId: selectedVoiceId,
				voiceName: activeVoice?.name || "Voice",
				modelId: selectedModelId || "default",
				modelName: activeModel?.name || "Model",
				audioSrc: fullAudioSrc,
				settings: voiceSettings,
				alignment: response.alignment,
			};

			return historyItem;
		},
		onSuccess: (historyItem) => {
			setActiveAudio(historyItem);
			addToHistory(historyItem);
			toast.success("Speech generated successfully!");
		},
		onError: (err: Error) => {
			toast(
				err.message || "Failed to generate speech. Please try again.",
				{
					variant: "danger",
				}
			);
		},
	});

	const generate = useCallback(() => {
		if (canGenerate && !mutation.isPending) {
			mutation.mutate();
		}
	}, [canGenerate, mutation]);

	return {
		generate,
		isGenerating: mutation.isPending,
		isSuccess: mutation.isSuccess,
		isError: mutation.isError,
		error: mutation.error,
		canGenerate: canGenerate && !mutation.isPending,
	};
}
