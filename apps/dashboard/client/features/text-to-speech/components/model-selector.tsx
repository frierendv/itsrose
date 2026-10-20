"use client";

import type { Selection } from "@heroui/react";
import { Button } from "@heroui/react/button";
import { Chip } from "@heroui/react/chip";
import { Description } from "@heroui/react/description";
import { Label } from "@heroui/react/label";
import { ListBox } from "@heroui/react/list-box";
import { ListBoxItem, ListBoxItemIndicator } from "@heroui/react/list-box-item";
import { ScrollShadow } from "@heroui/react/scroll-shadow";
import { Skeleton } from "@heroui/react/skeleton";
import { memo, useCallback } from "react";
import { useModels } from "../api/queries";
import type { Model } from "../api/types";
import { useTTSStore } from "../store/use-tts-store";

export const ModelSelector = memo(() => {
	const selectedModelId = useTTSStore((s) => s.selectedModelId);
	const setSelectedModelId = useTTSStore((s) => s.setSelectedModelId);
	const setCharacterLimit = useTTSStore((s) => s.setCharacterLimit);

	const { models, isPending, isError, error, refetch } = useModels();

	const handleSelection = useCallback(
		(keys: Selection) => {
			const selectedKey = Array.from(keys)[0];
			if (selectedKey) {
				const m = models.find(
					(item) => item.model_id === String(selectedKey)
				);
				if (m) {
					setSelectedModelId(m.model_id);
					setCharacterLimit(m.maximum_text_length_per_request);
				}
			}
		},
		[models, setCharacterLimit, setSelectedModelId]
	);

	if (isPending) {
		return (
			<div className="flex flex-col gap-3 p-1">
				{Array.from({ length: 4 }).map((_, i) => (
					<Skeleton key={i} className="h-20 w-full rounded-xl" />
				))}
			</div>
		);
	}

	if (isError) {
		return (
			<div className="flex flex-col items-center justify-center p-6 text-center gap-3">
				<p className="text-sm text-danger">
					{error?.message || "Failed to load models"}
				</p>
				<Button size="sm" variant="secondary" onPress={() => refetch()}>
					Retry
				</Button>
			</div>
		);
	}

	return (
		<ScrollShadow className="flex flex-col gap-1.5 overflow-y-auto max-h-[calc(100vh-320px)]">
			<ListBox
				aria-label="Models"
				selectionMode="single"
				selectedKeys={selectedModelId ? [selectedModelId] : []}
				onSelectionChange={handleSelection}
				className="flex flex-col gap-2 p-0"
			>
				{models.map((item: Model) => (
					<ListBoxItem
						key={item.model_id}
						id={item.model_id}
						textValue={item.name}
						className="data-[selected=true]:bg-accent/5 p-3 rounded-xl border border-transparent data-[selected=true]:border-accent/20"
					>
						<div className="flex flex-col gap-1.5 w-full">
							<div className="flex items-center justify-between gap-2">
								<Label className="font-semibold text-sm">
									{item.name}
								</Label>
								<Chip
									size="sm"
									variant="soft"
									className="text-[11px]"
								>
									{item.maximum_text_length_per_request.toLocaleString()}{" "}
									chars
								</Chip>
							</div>

							{item.description && (
								<Description className="text-xs text-muted line-clamp-2">
									{item.description}
								</Description>
							)}

							{item.languages && item.languages.length > 0 && (
								<div className="flex flex-wrap gap-1 pt-1">
									{item.languages.slice(0, 5).map((lang) => (
										<Chip
											key={lang.language_id}
											size="sm"
											variant="secondary"
											className="text-[10px] h-5"
										>
											{lang.name}
										</Chip>
									))}
									{item.languages.length > 5 && (
										<span className="text-[10px] text-muted self-center">
											+{item.languages.length - 5} more
										</span>
									)}
								</div>
							)}
						</div>
						<ListBoxItemIndicator />
					</ListBoxItem>
				))}
			</ListBox>
		</ScrollShadow>
	);
});

ModelSelector.displayName = "ModelSelector";
