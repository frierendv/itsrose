import { Decoration, Extension } from "@tiptap/react";

/**
 * The bound on one bracketed direction tag.
 *
 * Speech input uses square brackets for delivery notes such as `[sighs]` or
 * `[whispers]`. The editor highlights them so the owner can see at a glance
 * which part of the script is spoken and which part directs the performance.
 * A tag is never empty and never spans a line, and 40 characters is wide
 * enough for a phrase while keeping a stray `[` from swallowing a paragraph.
 */
const BRACKET_TAG_SOURCE = "\\[[^\\]\\n]{1,40}\\]";

/** The CSS class the decoration attaches to every bracketed tag. */
export const BRACKET_TAG_CLASS = "speech-bracket-tag";

/**
 * The classes the decoration paints with.
 *
 * `BRACKET_TAG_CLASS` is the stable hook the tests and any custom CSS can
 * target; the Tailwind utilities come along in the same attribute so the tag
 * is visibly distinct without a global stylesheet rule. Tailwind scans this
 * file, so the utilities are emitted even though they only appear here.
 */
const BRACKET_TAG_DECORATION_CLASS = `${BRACKET_TAG_CLASS} text-accent font-semibold`;

/** A bracket range as offsets into the text it was found in. */
export type BracketTagRange = {
	/** The index of the opening `[`. */
	from: number;
	/** The index just past the closing `]`. */
	to: number;
};

/**
 * Finds the bracketed tags in `text` and their offsets.
 *
 * Exported separately from the extension so the scanning rule is testable
 * without an editor instance. The regular expression is rebuilt per call so a
 * caller can never inherit a stale `lastIndex`.
 */
export function findBracketTagRanges(text: string): BracketTagRange[] {
	const ranges: BracketTagRange[] = [];
	const pattern = new RegExp(BRACKET_TAG_SOURCE, "g");

	for (let match = pattern.exec(text); match; match = pattern.exec(text)) {
		ranges.push({ from: match.index, to: match.index + match[0].length });
	}

	return ranges;
}

/**
 * Lists the bracketed tags in `text`, in document order.
 *
 * This is the pure helper the tests and any future command palette validation
 * read; the extension uses {@link findBracketTagRanges} because it needs the
 * offsets, not the strings.
 */
export function findBracketTags(text: string): string[] {
	return findBracketTagRanges(text).map((range) =>
		text.slice(range.from, range.to)
	);
}

/**
 * Highlights bracketed direction tags in the speech editor.
 *
 * Tiptap 3's `addDecorations` builds the decorations and registers the
 * ProseMirror plugin that paints them; the extension owns the scanning rule
 * only. The scan is document-wide because every keystroke can move or resize
 * a tag, and a speech script is capped at 5000 characters, so re-scanning the
 * whole doc on each change is cheaper than tracking ranges.
 */
export const BracketTagHighlight = Extension.create({
	name: "bracketTagHighlight",

	addDecorations() {
		return {
			create: ({ state }) => {
				const decorations: Decoration[] = [];

				state.doc.descendants((node, pos) => {
					if (!node.isText || !node.text) {
						return;
					}

					for (const range of findBracketTagRanges(node.text)) {
						decorations.push(
							Decoration.Inline(
								pos + range.from,
								pos + range.to,
								{
									class: BRACKET_TAG_DECORATION_CLASS,
								}
							)
						);
					}
				});

				return decorations;
			},
		};
	},
});
