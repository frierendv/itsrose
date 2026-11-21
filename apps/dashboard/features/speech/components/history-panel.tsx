"use client";

import { useAudioPlayer } from "@/components/ui/audio-player";
import { formatAssetDate } from "@/features/assets/utils";
import { getErrorMessage } from "@/lib/errors";
import { ArrowDownToLine, FloppyDisk, Play, TrashBin } from "@gravity-ui/icons";
import {
	Alert,
	Button,
	Chip,
	EmptyState,
	Pagination,
	SearchField,
	Skeleton,
	toast,
	Typography,
} from "@heroui/react";
import { cn } from "@itsrose/react/core";
import { useMemo, useState } from "react";
import { SPEECH_GENERATIONS_PAGE_SIZE } from "../constants";
import {
	useDeleteGenerationMutation,
	useGenerationUrlMutation,
	useSaveGenerationMutation,
	useSpeechGenerations,
} from "../hooks";
import type { GenerationItem } from "../types";
import {
	downloadAudioFile,
	generationExcerpt,
	generationFilename,
	isExpiredGenerationError,
	UNTITLED_GENERATION,
} from "../utils";
import { DeleteGenerationDialog } from "./delete-generation-dialog";

/** The message a 410 on the URL action shows instead of a transport error. */
const EXPIRED_MESSAGE =
	"This generation has expired. Its audio is no longer available, so it cannot be played.";

/**
 * The History tab: the paginated generation log and its row actions.
 *
 * Nothing is appended optimistically. Play mints a signed URL on demand and
 * hands it to the global player, Save promotes the result into the asset
 * library under an automatic `tts-<date>` name, and Delete removes the row
 * while leaving a previously saved asset alone. The list is offset-paginated
 * because the API returns no total, so a full page is what enables "Next".
 */
export const HistoryPanel: React.FC = () => {
	const [offset, setOffset] = useState(0);
	const [playingId, setPlayingId] = useState<string | null>(null);
	const [savingId, setSavingId] = useState<string | null>(null);
	const [downloadingId, setDownloadingId] = useState<string | null>(null);
	const [searchQuery, setSearchQuery] = useState("");
	const [actionError, setActionError] = useState<string | null>(null);
	const [generationToDelete, setGenerationToDelete] =
		useState<GenerationItem | null>(null);

	const player = useAudioPlayer();
	const urlMutation = useGenerationUrlMutation();
	const saveMutation = useSaveGenerationMutation();
	const deleteMutation = useDeleteGenerationMutation();

	const { generations, isPending, isError, error, refetch, hasNextPage } =
		useSpeechGenerations({
			limit: SPEECH_GENERATIONS_PAGE_SIZE,
			offset,
		});

	const filteredGenerations = useMemo(() => {
		if (!searchQuery.trim()) {
			return generations;
		}
		const query = searchQuery.toLowerCase();
		return generations.filter((gen) =>
			(gen.input_text?.toLowerCase() ?? "").includes(query)
		);
	}, [generations, searchQuery]);

	const handleDownload = async (generation: GenerationItem) => {
		if (generation.expired) {
			return;
		}
		setDownloadingId(generation.generation_id);

		try {
			const signed = await urlMutation.mutateAsync(
				generation.generation_id
			);
			await downloadAudioFile(
				signed.url,
				generationFilename(generation.created_at)
			);
		} catch (err) {
			toast.danger(
				getErrorMessage(err, "The generation could not be downloaded.")
			);
		} finally {
			setDownloadingId(null);
		}
	};

	const handlePlay = async (generation: GenerationItem) => {
		if (generation.expired) {
			return;
		}

		setActionError(null);
		setPlayingId(generation.generation_id);

		try {
			const signed = await urlMutation.mutateAsync(
				generation.generation_id
			);
			player.play({
				src: signed.url,
				title: generationExcerpt(generation.input_text),
				subtitle: "Generated speech",
			});
		} catch (err) {
			if (isExpiredGenerationError(err)) {
				// The row is stale: the object expired between the list read
				// and the URL mint, so report the outcome and pull fresh rows.
				setActionError(EXPIRED_MESSAGE);
				void refetch();
			} else {
				toast.danger(
					getErrorMessage(err, "The generation could not be played.")
				);
			}
		} finally {
			setPlayingId(null);
		}
	};

	const handleSave = async (generation: GenerationItem) => {
		setSavingId(generation.generation_id);

		try {
			const saved = await saveMutation.mutateAsync({
				generationId: generation.generation_id,
				filename: generationFilename(generation.created_at),
			});

			toast.success(
				saved.already_saved
					? "This generation was already saved to your asset library."
					: "The generation was saved to your asset library."
			);
		} catch (err) {
			toast.danger(
				getErrorMessage(err, "The generation could not be saved.")
			);
		} finally {
			setSavingId(null);
		}
	};

	const handleDelete = async () => {
		if (!generationToDelete) {
			return;
		}

		const { generation_id } = generationToDelete;

		try {
			const result = await deleteMutation.mutateAsync(generation_id);
			if (!result.deleted) {
				toast.danger("The generation could not be deleted.");
				return;
			}

			toast.success("The generation was deleted from your history.");
			setGenerationToDelete(null);

			// Deleting the last row of a later page would leave the offset
			// past the end of the history.
			if (generations.length === 1 && offset > 0) {
				setOffset(Math.max(0, offset - SPEECH_GENERATIONS_PAGE_SIZE));
			}
		} catch (err) {
			toast.danger(
				getErrorMessage(err, "The generation could not be deleted.")
			);
		}
	};

	const hasPageFooter = generations.length > 0 || offset > 0;

	return (
		<div className="flex flex-col gap-4">
			{isError ? (
				<Alert status="danger" className="w-full">
					<Alert.Indicator />
					<Alert.Content>
						<Alert.Title>Could not load your history</Alert.Title>
						<Alert.Description>
							{getErrorMessage(
								error,
								"The generation history request failed."
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
			) : null}

			{actionError ? (
				<Alert status="warning" className="w-full">
					<Alert.Indicator />
					<Alert.Content>
						<Alert.Title>Generation expired</Alert.Title>
						<Alert.Description>{actionError}</Alert.Description>
					</Alert.Content>
				</Alert>
			) : null}

			{generations.length > 0 || searchQuery ? (
				<SearchField
					aria-label="Search history"
					value={searchQuery}
					onChange={setSearchQuery}
				>
					<SearchField.Group>
						<SearchField.SearchIcon />
						<SearchField.Input placeholder="Search history..." />
						<SearchField.ClearButton />
					</SearchField.Group>
				</SearchField>
			) : null}

			{isPending ? (
				<div
					aria-label="Loading history"
					className="flex flex-col gap-2"
					role="status"
				>
					<Skeleton className="h-16 w-full" />
					<Skeleton className="h-16 w-full" />
					<Skeleton className="h-16 w-full" />
				</div>
			) : null}

			{!isPending && !isError && generations.length === 0 ? (
				<EmptyState>
					<Typography type="body-sm" color="muted">
						No generations yet. Write a script and generate speech
						to see it here.
					</Typography>
				</EmptyState>
			) : null}

			{!isPending &&
			!isError &&
			generations.length > 0 &&
			filteredGenerations.length === 0 ? (
				<EmptyState>
					<Typography type="body-sm" color="muted">
						No generations match &ldquo;{searchQuery}&rdquo;.
					</Typography>
				</EmptyState>
			) : null}

			{filteredGenerations.length > 0 ? (
				<ul
					aria-label="Generation history"
					className="flex flex-col gap-2"
				>
					{filteredGenerations.map((generation) => {
						const excerpt = generationExcerpt(
							generation.input_text
						);
						const isPlaying =
							playingId === generation.generation_id;
						const isSaving = savingId === generation.generation_id;

						return (
							<li
								key={generation.generation_id}
								className="flex flex-col gap-3 rounded-medium border border-separator p-3"
							>
								<div className="flex min-w-0 flex-col gap-1">
									<Typography
										className={cn(
											"truncate",
											excerpt === UNTITLED_GENERATION
												? "text-muted italic"
												: "font-medium"
										)}
										type="body-sm"
									>
										{excerpt}
									</Typography>
									<div className="flex flex-wrap items-center gap-2">
										<time
											dateTime={generation.created_at}
											className="text-muted text-xs"
										>
											{formatAssetDate(
												generation.created_at
											)}
										</time>
										{generation.saved ? (
											<Chip
												color="success"
												size="sm"
												variant="soft"
											>
												Saved
											</Chip>
										) : null}
										{generation.expired ? (
											<Chip
												color="danger"
												size="sm"
												variant="soft"
											>
												Expired
											</Chip>
										) : null}
										<Typography
											type="body-xs"
											color="muted"
										>
											{generation.status}
										</Typography>
									</div>
								</div>

								<div className="flex flex-wrap items-center gap-2">
									<Button
										aria-label={`Play ${excerpt}`}
										isDisabled={
											generation.expired ||
											playingId !== null
										}
										isPending={isPlaying}
										size="sm"
										variant="ghost"
										onPress={() =>
											void handlePlay(generation)
										}
									>
										<Play
											aria-hidden
											className="size-3.5"
										/>
										<span>Play</span>
									</Button>

									<Button
										aria-label={`Download ${excerpt}`}
										isDisabled={
											generation.expired ||
											downloadingId !== null
										}
										isPending={
											downloadingId ===
											generation.generation_id
										}
										size="sm"
										variant="ghost"
										onPress={() =>
											void handleDownload(generation)
										}
									>
										<ArrowDownToLine
											aria-hidden
											className="size-3.5"
										/>
										<span>Download</span>
									</Button>

									{!generation.saved &&
									!generation.expired ? (
										<Button
											aria-label={`Save ${excerpt}`}
											isDisabled={savingId !== null}
											isPending={isSaving}
											size="sm"
											variant="ghost"
											onPress={() =>
												void handleSave(generation)
											}
										>
											<FloppyDisk
												aria-hidden
												className="size-3.5"
											/>
											<span>Save</span>
										</Button>
									) : null}

									<Button
										aria-label={`Delete ${excerpt}`}
										isDisabled={deleteMutation.isPending}
										size="sm"
										variant="danger-soft"
										onPress={() =>
											setGenerationToDelete(generation)
										}
									>
										<TrashBin
											aria-hidden
											className="size-3.5"
										/>
										<span>Delete</span>
									</Button>
								</div>
							</li>
						);
					})}
				</ul>
			) : null}

			{hasPageFooter ? (
				<Pagination size="sm">
					<Pagination.Summary>
						{generations.length > 0
							? `Showing ${offset + 1}–${offset + generations.length}`
							: "No generations on this page"}
					</Pagination.Summary>
					<Pagination.Content>
						<Pagination.Item>
							<Pagination.Previous
								isDisabled={offset === 0 || isPending}
								onPress={() =>
									setOffset(
										Math.max(
											0,
											offset -
												SPEECH_GENERATIONS_PAGE_SIZE
										)
									)
								}
							>
								<Pagination.PreviousIcon />
								Prev
							</Pagination.Previous>
						</Pagination.Item>
						<Pagination.Item>
							<Pagination.Next
								isDisabled={!hasNextPage || isPending}
								onPress={() =>
									setOffset(
										offset + SPEECH_GENERATIONS_PAGE_SIZE
									)
								}
							>
								Next
								<Pagination.NextIcon />
							</Pagination.Next>
						</Pagination.Item>
					</Pagination.Content>
				</Pagination>
			) : null}

			<DeleteGenerationDialog
				generation={generationToDelete}
				isPending={deleteMutation.isPending}
				onConfirm={() => void handleDelete()}
				onOpenChange={(open) => {
					if (!open) {
						setGenerationToDelete(null);
					}
				}}
			/>
		</div>
	);
};

HistoryPanel.displayName = "HistoryPanel";
