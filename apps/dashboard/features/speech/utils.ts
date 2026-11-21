import { ApiError } from "@/lib/api/envelope";

/** How much of a generation's script the history row and player title show. */
const EXCERPT_MAX_LENGTH = 96;

/** The label a generation with no input (an older row, or a non-text feature) reads as. */
export const UNTITLED_GENERATION = "Untitled generation";

/**
 * Collapses a generation's input into a one-line excerpt.
 *
 * A script keeps its line breaks while it is being written, but a history row
 * is a single line and the floating player is narrower still. Whitespace is
 * collapsed and a long script is cut at a word boundary with an ellipsis; a
 * generation with no input (an older row, or a non-text feature) still needs a
 * label, so it reads as {@link UNTITLED_GENERATION}.
 */
export function generationExcerpt(inputText: string | null): string {
	const collapsed = inputText?.replace(/\s+/g, " ").trim() ?? "";
	if (!collapsed) {
		return UNTITLED_GENERATION;
	}

	if (collapsed.length <= EXCERPT_MAX_LENGTH) {
		return collapsed;
	}

	const cut = collapsed.slice(0, EXCERPT_MAX_LENGTH - 1);
	const lastSpace = cut.lastIndexOf(" ");
	const trimmed = lastSpace > 0 ? cut.slice(0, lastSpace) : cut;

	return `${trimmed.trimEnd()}…`;
}

/**
 * Builds the filename a generation is saved under.
 *
 * The name is derived from the generation's `created_at` rather than the save
 * time: the date then describes the audio, and saving the same generation
 * twice produces the same name instead of a moving target. The API records
 * UTC, so the short date is the UTC calendar day.
 */
export function generationFilename(createdAt: string): string {
	const created = new Date(createdAt);
	const date = Number.isNaN(created.getTime()) ? new Date() : created;

	return `tts-${date.toISOString().slice(0, 10)}`;
}

/**
 * Tells an expired generation apart from any other failed read.
 *
 * `GET /studio/generations/:id/url` answers 410 once the ephemeral object is
 * gone; the row is then still listed but its audio cannot be played, which the
 * panel reports instead of a generic request failure.
 */
export function isExpiredGenerationError(error: unknown): boolean {
	return error instanceof ApiError && error.status === 410;
}

/**
 * Initiates a browser file download of an audio file URL.
 */
export async function downloadAudioFile(
	url: string,
	filename: string
): Promise<void> {
	try {
		const response = await fetch(url);
		const blob = await response.blob();
		const objectUrl = URL.createObjectURL(blob);
		const anchor = document.createElement("a");
		anchor.href = objectUrl;
		anchor.download = filename.endsWith(".mp3")
			? filename
			: `${filename}.mp3`;
		document.body.append(anchor);
		anchor.click();
		anchor.remove();
		URL.revokeObjectURL(objectUrl);
	} catch {
		// Fallback: direct navigation download
		window.open(url, "_blank");
	}
}
