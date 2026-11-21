"use client";

import { useAudioPlayer } from "@/components/ui/audio-player";
import { getAssetUrl } from "@/features/assets/api";
import { useVoices } from "@/features/voices/hooks";
import type { Voice } from "@/features/voices/types";
import { getErrorMessage } from "@/lib/errors";
import { Play } from "@gravity-ui/icons";
import {
	Alert,
	Button,
	EmptyState,
	Skeleton,
	toast,
	Typography,
} from "@heroui/react";
import { cn } from "@itsrose/react/core";
import { useState } from "react";

export interface SettingsPanelProps {
	/** The voice the generate call will use, or `null` before one is chosen. */
	selectedVoiceId: string | null;
	onSelectVoice: (voiceId: string) => void;
}

type VoiceGroup = {
	label: string;
	voices: Voice[];
};

/**
 * Splits the library into the owner's clones and the platform catalogue.
 *
 * The order is the reading order the API already uses, stated here so the
 * panel does not inherit it by accident: a clone is the personal choice and
 * the catalogue is the fallback.
 */
function groupVoices(voices: Voice[]): VoiceGroup[] {
	return [
		{
			label: "Your voices",
			voices: voices.filter((voice) => voice.source === "cloned"),
		},
		{
			label: "Catalogue",
			voices: voices.filter((voice) => voice.source === "premade"),
		},
	].filter((group) => group.voices.length > 0);
}

/**
 * Whether a voice has anything to audition.
 *
 * The catalogue omits `preview_url` when a premade voice has no preview, so an
 * absent field disables the button exactly like an explicit `null`.
 */
function hasPreview(voice: Voice): boolean {
	return voice.source === "cloned"
		? voice.sample_asset_id !== null
		: Boolean(voice.preview_url);
}

interface VoiceRowProps {
	voice: Voice;
	isSelected: boolean;
	isPreviewing: boolean;
	canPreview: boolean;
	onSelect: () => void;
	onPreview: () => void;
}

const VoiceRow: React.FC<VoiceRowProps> = ({
	voice,
	isSelected,
	isPreviewing,
	canPreview,
	onSelect,
	onPreview,
}) => {
	const initial = voice.name.slice(0, 1).toUpperCase();

	return (
		<li className="flex items-center gap-2">
			<button
				aria-pressed={isSelected}
				className={cn(
					"flex min-w-0 flex-1 items-center justify-between gap-2.5 rounded-medium border px-3 py-2 text-left text-sm transition-colors",
					isSelected
						? "border-accent bg-accent/10 text-accent"
						: "border-separator hover:bg-surface-secondary"
				)}
				type="button"
				onClick={onSelect}
			>
				<div className="flex min-w-0 items-center gap-2.5">
					<span
						aria-hidden="true"
						className={cn(
							"flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold uppercase",
							isSelected
								? "bg-accent text-accent-foreground"
								: "bg-surface-secondary text-muted"
						)}
					>
						{initial}
					</span>
					<span className="truncate font-medium">{voice.name}</span>
				</div>
				{isSelected ? (
					<span className="shrink-0 text-xs font-medium">
						Selected
					</span>
				) : null}
			</button>

			<Button
				isIconOnly
				aria-label={`Preview ${voice.name}`}
				isDisabled={!canPreview || isPreviewing}
				isPending={isPreviewing}
				size="sm"
				variant="ghost"
				onPress={onPreview}
			>
				<Play aria-hidden className="size-4" />
			</Button>
		</li>
	);
};

/**
 * The Settings tab: the voice library and its audition buttons.
 *
 * A clone's preview is its sample asset, read through a short-lived signed
 * URL exactly like the asset library does; a premade voice plays the
 * catalogue's own `preview_url` when the catalogue supplies one. A voice with
 * neither source is not previewable, so its button is disabled rather than
 * silently doing nothing.
 * The library owns no model selector or synthesis sliders because the speech
 * contract does not expose them.
 */
export const SettingsPanel: React.FC<SettingsPanelProps> = ({
	selectedVoiceId,
	onSelectVoice,
}) => {
	const player = useAudioPlayer();
	const { voices, isPending, isError, error, refetch } = useVoices();
	const [previewingVoiceId, setPreviewingVoiceId] = useState<string | null>(
		null
	);

	const handlePreview = async (voice: Voice) => {
		setPreviewingVoiceId(voice.voice_id);

		try {
			let src: string | undefined;

			if (voice.source === "cloned") {
				if (!voice.sample_asset_id) {
					return;
				}
				const signed = await getAssetUrl(voice.sample_asset_id);
				src = signed.url;
			} else {
				src = voice.preview_url ?? undefined;
			}

			if (!src) {
				return;
			}

			player.play({
				src,
				title: voice.name,
				subtitle: "Voice preview",
			});
		} catch (err) {
			toast.danger(
				getErrorMessage(err, "The voice preview could not be played.")
			);
		} finally {
			setPreviewingVoiceId(null);
		}
	};

	if (isPending) {
		return (
			<div
				aria-label="Loading voices"
				className="flex flex-col gap-2"
				role="status"
			>
				<Skeleton className="h-4 w-24" />
				<Skeleton className="h-10 w-full" />
				<Skeleton className="h-10 w-full" />
				<Skeleton className="h-10 w-full" />
			</div>
		);
	}

	if (isError) {
		return (
			<Alert status="danger" className="w-full">
				<Alert.Indicator />
				<Alert.Content>
					<Alert.Title>Could not load your voices</Alert.Title>
					<Alert.Description>
						{getErrorMessage(
							error,
							"The voice library request failed."
						)}
					</Alert.Description>
				</Alert.Content>
				<Button
					size="sm"
					variant="outline"
					onPress={() => void refetch()}
				>
					Retry
				</Button>
			</Alert>
		);
	}

	const groups = groupVoices(voices);

	if (groups.length === 0) {
		return (
			<EmptyState>
				<Typography type="body-sm" color="muted">
					No voices are available yet. Clone one from an uploaded
					sample to get started.
				</Typography>
			</EmptyState>
		);
	}

	return (
		<div className="flex flex-col gap-5">
			{groups.map((group) => (
				<section key={group.label} className="flex flex-col gap-2">
					<Typography type="body-xs" color="muted">
						{group.label}
					</Typography>
					<ul
						aria-label={group.label}
						className="flex flex-col gap-1"
					>
						{group.voices.map((voice) => (
							<VoiceRow
								key={voice.voice_id}
								canPreview={hasPreview(voice)}
								isPreviewing={
									previewingVoiceId === voice.voice_id
								}
								isSelected={selectedVoiceId === voice.voice_id}
								voice={voice}
								onPreview={() => void handlePreview(voice)}
								onSelect={() => onSelectVoice(voice.voice_id)}
							/>
						))}
					</ul>
				</section>
			))}
		</div>
	);
};

SettingsPanel.displayName = "SettingsPanel";
