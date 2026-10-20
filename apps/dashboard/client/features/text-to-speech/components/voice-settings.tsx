"use client";

import { ArrowRotateLeft } from "@gravity-ui/icons";
import { Button } from "@heroui/react/button";
import { Chip } from "@heroui/react/chip";
import { Label } from "@heroui/react/label";
import { Slider } from "@heroui/react/slider";
import { Switch } from "@heroui/react/switch";
import { memo } from "react";
import {
	VOICE_SETTING_PRESETS,
	type VoiceSettingPresetKey,
} from "../store/constants";
import { useTTSStore } from "../store/use-tts-store";

export const VoiceSettings = memo(() => {
	const voiceSettings = useTTSStore((s) => s.voiceSettings);
	const updateVoiceSettings = useTTSStore((s) => s.updateVoiceSettings);
	const resetVoiceSettings = useTTSStore((s) => s.resetVoiceSettings);
	const applyPreset = useTTSStore((s) => s.applyPreset);

	return (
		<div className="flex flex-col gap-6 overflow-y-auto max-h-[calc(100vh-280px)] px-2">
			{/* Preset Chips */}
			<div className="flex flex-col gap-2">
				<Label className="text-xs text-muted font-medium">
					Quick Presets
				</Label>
				<div className="flex flex-wrap gap-1.5">
					{(
						Object.keys(
							VOICE_SETTING_PRESETS
						) as VoiceSettingPresetKey[]
					).map((key) => {
						const preset = VOICE_SETTING_PRESETS[key];
						return (
							<Chip
								key={key}
								size="sm"
								variant="secondary"
								className="cursor-pointer select-none text-xs"
								onClick={() => applyPreset(key)}
							>
								{preset.label}
							</Chip>
						);
					})}
				</div>
			</div>

			{/* Sliders */}
			<div className="flex flex-col gap-5 w-full">
				{/* Speed Slider */}
				<Slider
					value={voiceSettings.speed}
					minValue={0.7}
					maxValue={1.2}
					step={0.01}
					onChange={(val) => {
						const v = Array.isArray(val) ? val[0] : val;
						updateVoiceSettings({ speed: v });
					}}
				>
					<Label>Speed</Label>
					<Slider.Output>
						{voiceSettings.speed.toFixed(2)}x
					</Slider.Output>
					<Slider.Track className="h-1">
						<Slider.Fill />
						<Slider.Thumb className="h-1.5" />
					</Slider.Track>
				</Slider>

				{/* Stability Slider */}
				<Slider
					value={voiceSettings.stability}
					minValue={0}
					maxValue={1}
					step={0.01}
					onChange={(val) => {
						const v = Array.isArray(val) ? val[0] : val;
						updateVoiceSettings({ stability: v });
					}}
				>
					<Label>Stability</Label>
					<Slider.Output>
						{Math.round(voiceSettings.stability * 100)}%
					</Slider.Output>
					<Slider.Track className="h-1">
						<Slider.Fill />
						<Slider.Thumb className="h-1.5" />
					</Slider.Track>
				</Slider>

				{/* Similarity Boost */}
				<Slider
					value={voiceSettings.similarity_boost}
					minValue={0}
					maxValue={1}
					step={0.01}
					onChange={(val) => {
						const v = Array.isArray(val) ? val[0] : val;
						updateVoiceSettings({ similarity_boost: v });
					}}
				>
					<Label>Similarity</Label>
					<Slider.Output>
						{Math.round(voiceSettings.similarity_boost * 100)}%
					</Slider.Output>
					<Slider.Track className="h-1">
						<Slider.Fill />
						<Slider.Thumb className="h-1.5" />
					</Slider.Track>
				</Slider>

				{/* Style Exaggeration */}
				<Slider
					value={voiceSettings.style}
					minValue={0}
					maxValue={1}
					step={0.01}
					onChange={(val) => {
						const v = Array.isArray(val) ? val[0] : val;
						updateVoiceSettings({ style: v });
					}}
				>
					<Label>Style Exaggeration</Label>
					<Slider.Output>
						{Math.round(voiceSettings.style * 100)}%
					</Slider.Output>
					<Slider.Track className="h-1">
						<Slider.Fill />
						<Slider.Thumb className="h-1.5" />
					</Slider.Track>
				</Slider>
			</div>

			{/* Speaker Boost & Reset */}
			<div className="flex flex-row justify-between gap-4 pt-2 items-center">
				<Switch
					isSelected={voiceSettings.use_speaker_boost}
					onChange={(isSelected) =>
						updateVoiceSettings({ use_speaker_boost: isSelected })
					}
				>
					<Switch.Content>
						<Switch.Control>
							<Switch.Thumb />
						</Switch.Control>
						Speaker boost
					</Switch.Content>
				</Switch>

				<Button
					variant="outline"
					size="sm"
					onPress={resetVoiceSettings}
				>
					<ArrowRotateLeft className="size-3.5 mr-1" />
					Reset
				</Button>
			</div>
		</div>
	);
});

VoiceSettings.displayName = "VoiceSettings";
