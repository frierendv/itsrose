"use client";

import { ArrowDownToLine, Clock, Play, TrashBin } from "@gravity-ui/icons";
import { Button } from "@heroui/react/button";
import { Chip } from "@heroui/react/chip";
import { ScrollShadow } from "@heroui/react/scroll-shadow";
import { cn } from "@itsrose/react";
import { formatDistanceToNow } from "date-fns";
import { memo, useCallback } from "react";
import { downloadAudio } from "../api/client";
import type { HistoryItem } from "../api/types";
import { useTTSStore } from "../store/use-tts-store";

export const HistoryList = memo(() => {
	const history = useTTSStore((s) => s.history);
	const activeAudio = useTTSStore((s) => s.activeAudio);
	const setActiveAudio = useTTSStore((s) => s.setActiveAudio);
	const removeHistoryItem = useTTSStore((s) => s.removeHistoryItem);
	const clearHistory = useTTSStore((s) => s.clearHistory);

	const handleDownload = useCallback(
		(item: HistoryItem, e: React.MouseEvent) => {
			e.stopPropagation();
			const filename = `${item.voiceName.toLowerCase().replace(/\s+/g, "-")}-${item.timestamp}.mp3`;
			downloadAudio(item.audioSrc, filename);
		},
		[]
	);

	const handleRemove = useCallback(
		(id: string, e: React.MouseEvent) => {
			e.stopPropagation();
			removeHistoryItem(id);
		},
		[removeHistoryItem]
	);

	if (history.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center p-8 text-center gap-3 text-muted">
				<Clock className="size-8 stroke-[1.5]" />
				<div className="flex flex-col gap-1">
					<p className="text-sm font-medium text-foreground">
						No generation history yet
					</p>
					<p className="text-xs">
						Generated audio clips will appear here during this
						session.
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-3 h-full">
			{/* Header with Clear Action */}
			<div className="flex items-center justify-between px-1">
				<span className="text-xs text-muted font-medium">
					{history.length} {history.length === 1 ? "clip" : "clips"}{" "}
					generated
				</span>
				<Button
					size="sm"
					variant="ghost"
					className="text-xs text-danger hover:text-danger h-7 px-2"
					onPress={clearHistory}
				>
					<TrashBin className="size-3 mr-1" />
					Clear history
				</Button>
			</div>

			{/* Scrollable Clips List */}
			<ScrollShadow className="flex flex-col gap-2 overflow-y-auto flex-1 max-h-[calc(100vh-280px)]">
				<div className="flex flex-col gap-2 p-1">
					{history.map((item: HistoryItem) => {
						const isActive = activeAudio?.id === item.id;
						return (
							<div
								key={item.id}
								onClick={() => setActiveAudio(item)}
								className={cn(
									"flex flex-col gap-2 p-3 rounded-xl border transition-all cursor-pointer select-none",
									isActive
										? "border-accent bg-accent/5 shadow-sm"
										: "border-border/60 bg-surface/40 hover:bg-surface hover:border-border"
								)}
							>
								{/* Top Info Bar */}
								<div className="flex items-center justify-between gap-2">
									<div className="flex items-center gap-1.5 flex-wrap">
										<Chip
											size="sm"
											variant="secondary"
											className="text-[11px]"
										>
											{item.voiceName}
										</Chip>
										<span className="text-[10px] text-muted">
											{item.modelName}
										</span>
									</div>

									<span className="text-[10px] text-muted shrink-0">
										{formatDistanceToNow(item.timestamp, {
											addSuffix: true,
										})}
									</span>
								</div>

								{/* Prompt Text Preview */}
								<p className="text-xs text-foreground/90 line-clamp-2">
									{item.text}
								</p>

								{/* Action Buttons */}
								<div className="flex items-center justify-between pt-1 border-t border-border/20">
									<div className="flex items-center gap-1.5 text-xs text-accent font-medium">
										<Play className="size-3 fill-current" />
										<span>
											{isActive ? "Playing" : "Play"}
										</span>
									</div>

									<div className="flex items-center gap-1">
										<Button
											size="sm"
											variant="ghost"
											isIconOnly
											className="h-7 w-7 text-muted hover:text-foreground"
											onClick={(e) =>
												handleDownload(item, e)
											}
											aria-label="Download audio clip"
										>
											<ArrowDownToLine className="size-3.5" />
										</Button>
										<Button
											size="sm"
											variant="ghost"
											isIconOnly
											className="h-7 w-7 text-muted hover:text-danger"
											onClick={(e) =>
												handleRemove(item.id, e)
											}
											aria-label="Delete audio clip"
										>
											<TrashBin className="size-3.5" />
										</Button>
									</div>
								</div>
							</div>
						);
					})}
				</div>
			</ScrollShadow>
		</div>
	);
});

HistoryList.displayName = "HistoryList";
