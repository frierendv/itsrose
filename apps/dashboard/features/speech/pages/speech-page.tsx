"use client";

import { useAudioPlayer } from "@/components/ui/audio-player";
import { useGenerateSpeechMutation } from "@/features/speech/hooks";
import { useVoices } from "@/features/voices/hooks";
import { getErrorMessage } from "@/lib/errors";
import { Tabs, toast, Typography } from "@heroui/react";
import { useMemo, useState, type Key } from "react";
import type { RecentGeneration } from "../components/editor/inline-generation-list";
import { SpeechEditor } from "../components/editor/speech-editor";
import { HistoryPanel } from "../components/history-panel";
import { SettingsPanel } from "../components/settings-panel";
import { SPEECH_MAX_CHARACTERS } from "../constants";
import { generationExcerpt } from "../utils";

/** The two panels on the right; the tab bar shows one at a time. */
type SpeechTab = "settings" | "history";

/**
 * The speech surface: a script editor on the left, voice settings and the
 * generation history on the right, and one floating player shared by both
 * previews and generated audio.
 *
 * The page owns the three pieces of state the panes agree on — the script, the
 * selected voice and the active tab. The editor reports its plain text, the
 * settings panel selects a voice, and generating hands the result to the
 * global player while the history panel refetches the row the mutation
 * invalidated. Only the selected panel is mounted; the query cache keeps the
 * data warm across a switch, and the hidden panel stays out of the DOM.
 */
export const SpeechPage: React.FC = () => {
	const player = useAudioPlayer();
	const { voices } = useVoices();
	const generateMutation = useGenerateSpeechMutation();

	const [text, setText] = useState("");
	const [chosenVoiceId, setChosenVoiceId] = useState<string | null>(null);
	const [tab, setTab] = useState<SpeechTab>("settings");
	const [recentGenerations, setRecentGenerations] = useState<
		RecentGeneration[]
	>([]);

	// The starting voice is derived while the owner has not chosen one: the
	// first clone is the personal choice, and the first catalogue voice is the
	// fallback. Once a voice is chosen the choice wins, so a background
	// refetch of the library never moves the selection under the owner.
	const defaultVoiceId = useMemo(() => {
		const firstCloned = voices.find((voice) => voice.source === "cloned");
		const firstPremade = voices.find((voice) => voice.source === "premade");

		return (firstCloned ?? firstPremade)?.voice_id ?? null;
	}, [voices]);

	const selectedVoiceId = chosenVoiceId ?? defaultVoiceId;
	const selectedVoice = useMemo(
		() =>
			voices.find((voice) => voice.voice_id === selectedVoiceId) ?? null,
		[selectedVoiceId, voices]
	);

	const characters = text.length;
	const isOverLimit = characters > SPEECH_MAX_CHARACTERS;
	const canGenerate =
		Boolean(selectedVoice) && text.trim().length > 0 && !isOverLimit;

	const handleGenerate = async () => {
		if (!selectedVoice || !canGenerate) {
			return;
		}

		try {
			const generated = await generateMutation.mutateAsync({
				text,
				voice_id: selectedVoice.voice_id,
			});

			const newTake: RecentGeneration = {
				generation_id: generated.generation_id,
				audio_url: generated.audio_url,
				text,
				created_at: new Date().toISOString(),
				voice_name: selectedVoice.name,
			};

			setRecentGenerations((prev) => [newTake, ...prev.slice(0, 2)]);

			player.play({
				src: generated.audio_url,
				title: generationExcerpt(text),
				subtitle: "Generated speech",
			});
			toast.success("Speech generated. It is in your history.");
		} catch (error) {
			toast.danger(
				getErrorMessage(error, "The speech could not be generated.")
			);
		}
	};

	const handleTabChange = (key: Key) => {
		setTab(String(key) === "history" ? "history" : "settings");
	};

	return (
		<div className="flex flex-col gap-4 pb-24">
			<div className="flex items-center justify-between">
				<div className="flex flex-col gap-0.5">
					<Typography type="h3">Speech</Typography>
					<Typography type="body-xs" color="muted">
						Craft scripts with expressive direction tags like
						[sighs], preview voices, and generate speech.
					</Typography>
				</div>
			</div>

			<div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
				<SpeechEditor
					canGenerate={canGenerate}
					characters={characters}
					isGenerating={generateMutation.isPending}
					voiceName={selectedVoice?.name ?? null}
					onChange={setText}
					onGenerate={() => void handleGenerate()}
					onSelectVoiceClick={() => setTab("settings")}
					recentGenerations={recentGenerations}
				/>

				<div className="flex flex-col rounded-2xl border border-separator bg-surface/30 p-4">
					<Tabs selectedKey={tab} onSelectionChange={handleTabChange}>
						<Tabs.ListContainer>
							<Tabs.List aria-label="Speech panels">
								<Tabs.Tab id="settings">Settings</Tabs.Tab>
								<Tabs.Tab id="history">History</Tabs.Tab>
							</Tabs.List>
						</Tabs.ListContainer>

						<Tabs.Panel id="settings" className="pt-4">
							<SettingsPanel
								selectedVoiceId={selectedVoiceId}
								onSelectVoice={setChosenVoiceId}
							/>
						</Tabs.Panel>

						<Tabs.Panel id="history" className="pt-4">
							<HistoryPanel />
						</Tabs.Panel>
					</Tabs>
				</div>
			</div>
		</div>
	);
};

SpeechPage.displayName = "SpeechPage";
