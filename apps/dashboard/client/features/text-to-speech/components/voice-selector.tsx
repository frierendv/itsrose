"use client";

import Play from "@gravity-ui/icons/Play";
import Square from "@gravity-ui/icons/Square";
import type { Selection } from "@heroui/react";
import { Avatar } from "@heroui/react/avatar";
import { Button } from "@heroui/react/button";
import { Description } from "@heroui/react/description";
import { Label } from "@heroui/react/label";
import { ListBox } from "@heroui/react/list-box";
import { ListBoxItem, ListBoxItemIndicator } from "@heroui/react/list-box-item";
import { ScrollShadow } from "@heroui/react/scroll-shadow";
import { SearchField } from "@heroui/react/search-field";
import { Skeleton } from "@heroui/react/skeleton";
import { ToggleButton } from "@heroui/react/toggle-button";
import { ToggleButtonGroup } from "@heroui/react/toggle-button-group";
import { memo, useCallback, useMemo, useState } from "react";
import { useVoices } from "../api/queries";
import type { Voice } from "../api/types";
import { useTTSStore } from "../store/use-tts-store";

const CATEGORIES = [
	{ key: "all", label: "All Voices" },
	{ key: "premade", label: "Premade" },
	{ key: "professional", label: "Professional" },
] as const;

export const VoiceSelector = memo(() => {
	const [category, setCategory] = useState<string>("all");
	const [searchQuery, setSearchQuery] = useState<string>("");

	const selectedVoiceId = useTTSStore((s) => s.selectedVoiceId);
	const setSelectedVoiceId = useTTSStore((s) => s.setSelectedVoiceId);
	const previewSrc = useTTSStore((s) => s.previewSrc);
	const isPreviewPlaying = useTTSStore((s) => s.isPreviewPlaying);
	const isPreviewPending = useTTSStore((s) => s.isPreviewPending);
	const togglePreview = useTTSStore((s) => s.togglePreview);
	const stopPreview = useTTSStore((s) => s.stopPreview);

	const { voices, isPending, isError, error, refetch } = useVoices(category);

	// Handle category switch
	const handleCategoryChange = useCallback(
		(cat: string) => {
			stopPreview();
			setCategory(cat);
		},
		[stopPreview]
	);

	// Filter voices by search query
	const filteredVoices = useMemo(() => {
		const q = searchQuery.trim().toLowerCase();
		if (!q) {
			return voices;
		}
		return voices.filter((voice: Voice) => {
			const matchName = voice.name.toLowerCase().includes(q);
			const matchDesc = voice.description?.toLowerCase().includes(q);
			const matchCategory = voice.category?.toLowerCase().includes(q);
			const matchLabels = Object.values(voice.labels || {}).some((l) =>
				l.toLowerCase().includes(q)
			);
			return matchName || matchDesc || matchCategory || matchLabels;
		});
	}, [voices, searchQuery]);

	// Handle selection
	const handleSelection = useCallback(
		(keys: Selection) => {
			const selectedKey = Array.from(keys)[0];
			if (selectedKey) {
				setSelectedVoiceId(String(selectedKey));
			}
		},
		[setSelectedVoiceId]
	);

	if (isError) {
		return (
			<div className="flex flex-col items-center justify-center p-6 text-center gap-3">
				<p className="text-sm text-danger">{error?.message}</p>
				<Button size="sm" variant="secondary" onPress={() => refetch()}>
					Retry
				</Button>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-3 h-full">
			{/* Search input */}
			<SearchField
				aria-label="Search voices"
				value={searchQuery}
				onChange={(val) => {
					stopPreview();
					setSearchQuery(val);
				}}
				className="w-full"
			>
				<SearchField.Group>
					<SearchField.SearchIcon />
					<SearchField.Input placeholder="Search voices by name, accent..." />
					<SearchField.ClearButton />
				</SearchField.Group>
			</SearchField>

			{/* Category filter chips */}
			<div className="flex items-center gap-1.5 overflow-x-auto pb-1">
				<ToggleButtonGroup
					defaultSelectedKeys={[category]}
					selectionMode="single"
				>
					{CATEGORIES.map((cat) => (
						<ToggleButton
							key={cat.key}
							id={cat.key}
							size="sm"
							className="cursor-pointer select-none"
							onClick={() => handleCategoryChange(cat.key)}
						>
							{cat.label}
						</ToggleButton>
					))}
				</ToggleButtonGroup>
			</div>

			{/* Voices List */}
			{isPending ? (
				<div className="flex flex-col gap-2 p-1">
					{Array.from({ length: 6 }).map((_, i) => (
						<Skeleton key={i} className="h-12 w-full rounded-lg" />
					))}
				</div>
			) : (
				<ScrollShadow className="flex flex-col gap-1.5 overflow-y-auto flex-1 max-h-[calc(100vh-320px)]">
					<ListBox
						aria-label="Voices"
						selectionMode="single"
						className="p-0"
						selectedKeys={selectedVoiceId ? [selectedVoiceId] : []}
						onSelectionChange={handleSelection}
					>
						{filteredVoices.map((voice: Voice) => {
							const isCurrent = Boolean(
								voice.preview_url &&
								previewSrc === voice.preview_url
							);
							const isItemPlaying = isCurrent && isPreviewPlaying;
							const isItemPending = isCurrent && isPreviewPending;

							return (
								<ListBoxItem
									key={voice.voice_id}
									id={voice.voice_id}
									textValue={voice.name}
									className="data-[selected=true]:bg-accent/5"
									render={(props: object) => (
										<div className="flex items-center space-x-2 mr-2">
											<div {...props} />
											<Button
												isIconOnly
												variant="outline"
												onPress={() =>
													voice.preview_url &&
													togglePreview(
														voice.preview_url
													)
												}
												onClick={(e) =>
													e.stopPropagation()
												}
												isPending={isItemPending}
												isDisabled={!voice.preview_url}
												aria-label={
													isItemPlaying
														? `Stop preview for ${voice.name}`
														: `Play preview for ${voice.name}`
												}
											>
												{isItemPlaying ? (
													<Square className="size-3 fill-current" />
												) : (
													<Play className="size-3.5 fill-current" />
												)}
											</Button>
										</div>
									)}
								>
									<Avatar size="sm">
										<Avatar.Fallback>
											{voice.name.charAt(0)}
										</Avatar.Fallback>
									</Avatar>
									<div className="flex flex-col">
										<Label>{voice.name}</Label>
										{voice.description && (
											<Description className="text-[11px] text-muted line-clamp-1">
												{voice.description}
											</Description>
										)}
									</div>
									<ListBoxItemIndicator />
								</ListBoxItem>
							);
						})}
					</ListBox>
				</ScrollShadow>
			)}
		</div>
	);
});

VoiceSelector.displayName = "VoiceSelector";
