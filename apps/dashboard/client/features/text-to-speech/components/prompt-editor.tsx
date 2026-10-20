"use client";

import { TextShimmer } from "@/components/motion-primitives/text-shimmer";
import Sparkles from "@gravity-ui/icons/Sparkles";
import { Button } from "@heroui/react/button";
import { Card } from "@heroui/react/card";
import { Chip } from "@heroui/react/chip";
import { Description } from "@heroui/react/description";
import { ProgressCircle } from "@heroui/react/progress-circle";
import { Spinner } from "@heroui/react/spinner";
import { TextArea } from "@heroui/react/textarea";
import { cn } from "@itsrose/react";
import { memo, useMemo } from "react";
import { RichTextarea } from "rich-textarea";
import { useGenerateSpeech, useModels, useVoices } from "../api/queries";
import { SAMPLE_PROMPTS } from "../store/constants";
import { useTTSStore } from "../store/use-tts-store";

export const PromptEditor = memo(() => {
	const text = useTTSStore((s) => s.text);
	const setText = useTTSStore((s) => s.setText);
	const characterLimit = useTTSStore((s) => s.characterLimit);

	const { activeVoice } = useVoices("all");
	const { activeModel } = useModels();
	const { generate, isGenerating, canGenerate } = useGenerateSpeech();

	const charRatio = useMemo(() => {
		if (characterLimit <= 0) {
			return 0;
		}
		return Math.min((text.length / characterLimit) * 100, 100);
	}, [text.length, characterLimit]);

	const isOverLimit = characterLimit > 0 && text.length > characterLimit;

	const renderText = (value: string) =>
		value.split(/(\[[^\]]+\])/g).map((part, index) =>
			part.startsWith("[") && part.endsWith("]") ? (
				<span key={index} className="rounded bg-accent/20">
					{part}
				</span>
			) : (
				part
			)
		);

	return (
		<div className="flex flex-col gap-3 w-full h-full">
			<Card className="flex flex-col flex-1 p-4 gap-3">
				{/* Header with Selected Voice & Model badges */}
				<Card.Header>
					<div className="flex flex-wrap items-center gap-2 text-xs">
						<Chip size="sm" variant="secondary">
							{activeVoice?.name || "No Voice Selected"}
						</Chip>
						<Chip size="sm" variant="soft" color="accent">
							{activeModel?.name || "Default Model"}
						</Chip>
					</div>
				</Card.Header>

				<Card.Content>
					<form
						id="tts-text-form"
						onSubmit={(e) => {
							e.preventDefault();
							generate();
						}}
					>
						<TextArea
							aria-label="Text to convert into speech"
							className="w-full border-none shadow-none resize-none bg-transparent text-lg"
							rows={8}
							fullWidth
							value={text}
							onChange={(e) => setText(e.target.value)}
							placeholder="Type or paste the text you want to convert into speech here..."
							render={(props) => (
								<RichTextarea
									{...props}
									style={{ width: "100%" }}
								>
									{renderText}
								</RichTextarea>
							)}
						/>
					</form>

					{/* Quick Prompt Examples */}
					<div className="flex flex-wrap items-center gap-1.5 pt-3 pb-1">
						<span className="text-xs text-muted font-medium mr-1 hidden sm:inline">
							Examples:
						</span>
						{SAMPLE_PROMPTS.map((prompt) => (
							<Chip
								key={prompt.id}
								size="sm"
								variant="secondary"
								className="cursor-pointer select-none text-xs"
								onClick={() => setText(prompt.text)}
							>
								{prompt.title}
							</Chip>
						))}
					</div>
				</Card.Content>

				<Card.Footer className="flex flex-row justify-between items-center gap-2 pt-2 border-t border-border/40">
					{/* Character Count & Progress Indicator */}
					<div className="flex items-center gap-1.5 text-xs text-muted">
						<ProgressCircle
							className="size-4"
							aria-label="Max characters progress"
							data-value={charRatio}
						>
							<ProgressCircle.Track>
								<ProgressCircle.TrackCircle />
								<ProgressCircle.FillCircle
									className={cn({
										"stroke-danger": isOverLimit,
										"stroke-warning": charRatio > 90,
									})}
								/>
							</ProgressCircle.Track>
						</ProgressCircle>
						<Description
							className={cn("font-medium text-muted", {
								"text-danger": isOverLimit,
							})}
						>
							<span>{text.length}</span>
							{" / "}
							{characterLimit > 0 && (
								<span>{characterLimit.toLocaleString()}</span>
							)}
						</Description>
					</div>

					{/* Generate Action Button */}
					<Button
						type="submit"
						form="tts-text-form"
						variant="tertiary"
						className="min-w-44 font-medium shadow-sm"
						isDisabled={!canGenerate}
						isPending={isGenerating}
					>
						{isGenerating ? (
							<>
								<Spinner size="sm" color="current" />
								<TextShimmer>Synthesizing...</TextShimmer>
							</>
						) : (
							<>
								<Sparkles aria-hidden className="size-4" />
								<span>Generate</span>
							</>
						)}
					</Button>
				</Card.Footer>
			</Card>
		</div>
	);
});

PromptEditor.displayName = "PromptEditor";
