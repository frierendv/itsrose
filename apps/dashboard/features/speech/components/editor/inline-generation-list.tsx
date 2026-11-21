"use client";

import { useAudioPlayer } from "@/components/ui/audio-player";
import {
	downloadAudioFile,
	generationExcerpt,
	generationFilename,
} from "@/features/speech/utils";
import { ArrowDownToLine, Pause, Play } from "@gravity-ui/icons";
import { Button, Typography } from "@heroui/react";

export interface RecentGeneration {
	generation_id: string;
	audio_url: string;
	text: string;
	created_at: string;
	voice_name?: string | null;
}

export interface InlineGenerationListProps {
	generations: RecentGeneration[];
}

/**
 * Renders the recent speech takes directly inside the editor canvas beneath the text,
 * matching ElevenLabs' inline generation takes workflow.
 */
export const InlineGenerationList: React.FC<InlineGenerationListProps> = ({
	generations,
}) => {
	const player = useAudioPlayer();

	if (generations.length === 0) {
		return null;
	}

	return (
		<div className="flex flex-col gap-2 border-t border-separator/40 bg-surface/20 px-4 py-3">
			<Typography type="body-xs" color="muted" className="font-medium">
				Recent takes
			</Typography>
			<div className="flex flex-col gap-2">
				{generations.map((gen, idx) => {
					const isCurrentlyPlaying =
						player.track?.src === gen.audio_url && player.isPlaying;
					const title = generationExcerpt(gen.text);
					const label = `Take ${generations.length - idx}`;

					const handleToggle = () => {
						if (player.track?.src === gen.audio_url) {
							player.toggle();
						} else {
							player.play({
								src: gen.audio_url,
								title,
								subtitle: gen.voice_name ?? "Generated speech",
							});
						}
					};

					const handleDownload = () => {
						void downloadAudioFile(
							gen.audio_url,
							generationFilename(gen.created_at)
						);
					};

					return (
						<div
							key={gen.generation_id}
							className="flex items-center justify-between gap-3 rounded-xl border border-separator/70 bg-background/80 px-3.5 py-2 shadow-sm transition-colors hover:border-accent/40"
						>
							<div className="flex min-w-0 items-center gap-3">
								<Button
									isIconOnly
									size="sm"
									variant="primary"
									aria-label={
										isCurrentlyPlaying
											? `Pause ${label}`
											: `Play ${label}`
									}
									onPress={handleToggle}
									className="size-7 min-w-7"
								>
									{isCurrentlyPlaying ? (
										<Pause
											aria-hidden
											className="size-3.5"
										/>
									) : (
										<Play
											aria-hidden
											className="size-3.5"
										/>
									)}
								</Button>

								<div className="flex min-w-0 flex-col">
									<div className="flex items-center gap-2">
										<span className="text-xs font-semibold text-foreground">
											{label}
										</span>
										{gen.voice_name ? (
											<span className="text-[11px] text-muted">
												· {gen.voice_name}
											</span>
										) : null}
									</div>
									<Typography
										type="body-xs"
										color="muted"
										className="truncate max-w-sm text-[11px]"
									>
										{title}
									</Typography>
								</div>
							</div>

							<div className="flex items-center gap-2">
								{/* Decorative waveform bars */}
								<div
									aria-hidden="true"
									className="hidden items-center gap-0.5 sm:flex"
								>
									{[
										40, 75, 55, 90, 60, 80, 45, 95, 70, 50,
										85, 65,
									].map((h, i) => (
										<span
											key={i}
											className="w-0.5 rounded-full bg-accent/30"
											style={{ height: `${h * 0.16}px` }}
										/>
									))}
								</div>

								<Button
									isIconOnly
									size="sm"
									variant="ghost"
									aria-label={`Download ${label}`}
									onPress={handleDownload}
									className="size-7 min-w-7 text-muted hover:text-foreground"
								>
									<ArrowDownToLine
										aria-hidden
										className="size-3.5"
									/>
								</Button>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
};

InlineGenerationList.displayName = "InlineGenerationList";
