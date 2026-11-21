"use client";

import { SPEECH_MAX_CHARACTERS } from "@/features/speech/constants";
import { Sparkles } from "@gravity-ui/icons";
import { Button, Card, Separator, Typography } from "@heroui/react";
import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useRef } from "react";
import { BracketTagHighlight } from "./bracket-tag-extension";

/**
 * StarterKit reduced to what a speech script is.
 *
 * Speech input is plain prose plus the editor's own bracket highlighting, so
 * every structural node (headings, both lists and their item/keymap
 * extensions, blockquote, code block, horizontal rule) and every mark that
 * carries no meaning to a synthesiser (bold, italic, strikethrough,
 * underline, inline code, links) is switched off. What remains is the
 * document/paragraph/text core, hard breaks and undo/redo: a newline keeps
 * the script readable and the API sends the text as typed.
 */
const SPEECH_STARTER_KIT = StarterKit.configure({
	heading: false,
	bulletList: false,
	orderedList: false,
	listItem: false,
	listKeymap: false,
	blockquote: false,
	codeBlock: false,
	horizontalRule: false,
	bold: false,
	italic: false,
	strike: false,
	underline: false,
	code: false,
	link: false,
	trailingNode: false,
});

/** The extension stack is immutable, so it lives outside the component. */
const SPEECH_EDITOR_EXTENSIONS = [
	SPEECH_STARTER_KIT,
	Placeholder.configure({
		placeholder: "Type or paste text to generate speech…",
	}),
	BracketTagHighlight,
];

/**
 * Serialises the editor document into the text the API receives.
 *
 * Tiptap joins blocks with a blank line by default, which would spend the
 * character budget on empty lines; a speech script wants one newline per
 * paragraph. A trailing empty paragraph is an insertion point, not part of the
 * script, so trailing newlines are dropped from the payload and the counter.
 */
function readEditorText(editor: Editor): string {
	return editor.getText({ blockSeparator: "\n" }).replace(/\n+$/, "");
}

export interface SpeechEditorProps {
	/** Receives the editor's plain text after every change. */
	onChange: (text: string) => void;
	/** The character count of the current text, shown against the limit. */
	characters: number;
	/** The name of the selected voice, or `null` while none is chosen. */
	voiceName: string | null;
	isGenerating: boolean;
	/** False while the script is empty, over the limit or has no voice. */
	canGenerate: boolean;
	onGenerate: () => void;
}

/**
 * The left pane: the Tiptap script editor and its action bar.
 *
 * The editor owns no state that outlives a keystroke. The page holds the text
 * so the counter, the generate call and the empty guard read one source, and
 * the bottom bar is part of the card so the action always sits with the
 * script it submits.
 */
export const SpeechEditor: React.FC<SpeechEditorProps> = ({
	onChange,
	characters,
	voiceName,
	isGenerating,
	canGenerate,
	onGenerate,
}) => {
	// Tiptap keeps the `onUpdate` handler it was created with; the ref makes
	// the latest page callback win without recreating the editor.
	const onChangeRef = useRef(onChange);

	useEffect(() => {
		onChangeRef.current = onChange;
	}, [onChange]);

	const editor = useEditor({
		extensions: SPEECH_EDITOR_EXTENSIONS,
		content: "",
		// The page renders on the server before it hydrates; creating the
		// editor in an effect keeps the two passes identical.
		immediatelyRender: false,
		editorProps: {
			attributes: {
				class: "speech-editor min-h-72 px-4 py-3 text-sm leading-6 focus:outline-none",
				"aria-label": "Speech script",
			},
		},
		onUpdate: ({ editor: current }) => {
			onChangeRef.current(readEditorText(current));
		},
	});

	const isOverLimit = characters > SPEECH_MAX_CHARACTERS;

	return (
		<Card className="flex min-h-[32rem] flex-col">
			<Card.Content className="flex-1 p-0">
				<EditorContent editor={editor} />
			</Card.Content>

			<Separator />

			<Card.Footer className="flex flex-wrap items-center justify-between gap-3 p-4">
				<div className="flex min-w-0 flex-col gap-0.5">
					<Typography
						aria-live="polite"
						className={isOverLimit ? "text-danger" : undefined}
						type="body-xs"
					>
						{characters}/{SPEECH_MAX_CHARACTERS}
					</Typography>
					<Typography
						className="max-w-56 truncate"
						color="muted"
						type="body-xs"
					>
						{voiceName ?? "No voice selected"}
					</Typography>
				</div>

				<Button
					isDisabled={!canGenerate || isGenerating}
					isPending={isGenerating}
					variant="primary"
					onPress={onGenerate}
				>
					<Sparkles aria-hidden className="size-4" />
					<span>Generate speech</span>
				</Button>
			</Card.Footer>
		</Card>
	);
};

SpeechEditor.displayName = "SpeechEditor";
