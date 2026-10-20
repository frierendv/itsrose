"use client";

import { AudioPlayer } from "@/components/ui/audio-player";
import {
	ArrowDownToLine,
	ArrowRotateLeftNumber5,
	ArrowRotateRightNumber5,
	Copy,
} from "@gravity-ui/icons";
import { Button } from "@heroui/react/button";
import { Chip } from "@heroui/react/chip";
import { Tooltip } from "@heroui/react/tooltip";
import { cn } from "@itsrose/react";
import { memo, useCallback } from "react";
import { downloadAudio } from "../api/client";
import { useTTSStore } from "../store/use-tts-store";

export type ResultPlayerProps = {
	className?: string;
};

export const ResultPlayer = memo<ResultPlayerProps>(({ className }) => {
	const activeAudio = useTTSStore((s) => s.activeAudio);
	const fallbackText = useTTSStore((s) => s.text);

	const currentSrc = activeAudio?.audioSrc;
	const currentVoice = activeAudio?.voiceName || "Voice";
	const currentModel = activeAudio?.modelName || "Model";
	const currentPrompt = activeAudio?.text || fallbackText;

	const handleDownload = useCallback(() => {
		if (!currentSrc) {
			return;
		}
		const filename = `${currentVoice.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}.mp3`;
		downloadAudio(currentSrc, filename);
	}, [currentSrc, currentVoice]);

	const handleCopyPrompt = useCallback(() => {
		if (!currentPrompt) {
			return;
		}
		navigator.clipboard.writeText(currentPrompt);
	}, [currentPrompt]);

	if (!currentSrc) {
		return null;
	}

	return (
		<AudioPlayer
			src={currentSrc}
			className={cn(
				"sticky bottom-0 z-30 w-full rounded-2xl border border-border bg-surface/90 backdrop-blur-md shadow-2xl transition-all",
				className
			)}
		>
			<div className="flex flex-wrap items-center justify-between gap-2">
				<div className="flex flex-wrap items-center gap-2">
					<Chip size="sm" variant="secondary" className="text-xs">
						{currentVoice}
					</Chip>
					<span className="text-xs text-muted">·</span>
					<span className="text-xs text-muted">{currentModel}</span>
				</div>
			</div>

			{/* Playback Controls & Volume */}
			<div className="flex flex-col w-full">
				<div className="flex items-center justify-between pt-1">
					<div className="flex items-center gap-2">
						<AudioPlayer.Skip seconds={-5}>
							<ArrowRotateLeftNumber5 className="size-4" />
						</AudioPlayer.Skip>
						<AudioPlayer.PlayButton size="md" />
						<AudioPlayer.Skip seconds={5}>
							<ArrowRotateRightNumber5 className="size-4" />
						</AudioPlayer.Skip>
					</div>

					<div className="flex items-center gap-1.5 ml-auto">
						<Tooltip delay={0}>
							<Tooltip.Trigger>
								<Button
									size="sm"
									variant="ghost"
									isIconOnly
									className="text-muted hover:text-foreground"
									onPress={handleCopyPrompt}
								>
									<Copy className="size-3.5" />
								</Button>
							</Tooltip.Trigger>
							<Tooltip.Content>Copy prompt text</Tooltip.Content>
						</Tooltip>

						<Tooltip delay={0}>
							<Tooltip.Trigger>
								<Button
									size="sm"
									variant="outline"
									onPress={handleDownload}
									isIconOnly
									className="text-muted hover:text-foreground"
								>
									<ArrowDownToLine className="size-3.5" />
								</Button>
							</Tooltip.Trigger>
							<Tooltip.Content>
								Download audio clip
							</Tooltip.Content>
						</Tooltip>

						<AudioPlayer.Volume className="hidden md:flex" />
					</div>
				</div>

				{/* Progress Scrubber and Time */}
				<AudioPlayer.Progress>
					<div className="flex items-center gap-2.5 justify-between w-full">
						<AudioPlayer.Progress.Output
							type="current"
							className="text-xs text-muted font-mono shrink-0"
						/>
						<AudioPlayer.Progress.Track
							showTooltip={false}
							className="w-full"
						>
							<AudioPlayer.Progress.Fill
								showBuffered={false}
								className="h-1"
							/>
							<AudioPlayer.Progress.Thumb className="size-3" />
						</AudioPlayer.Progress.Track>
						<AudioPlayer.Progress.Output
							type="duration"
							className="text-xs text-muted font-mono shrink-0"
						/>
					</div>
				</AudioPlayer.Progress>
			</div>
		</AudioPlayer>
	);
});

ResultPlayer.displayName = "ResultPlayer";
