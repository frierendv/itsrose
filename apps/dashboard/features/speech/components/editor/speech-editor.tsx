"use client";

import {
	SPEECH_DIRECTION_TAGS,
	SPEECH_MAX_CHARACTERS,
} from "@/features/speech/constants";
import { ChevronDown, Sparkles } from "@gravity-ui/icons";
import {
	Button,
	buttonVariants,
	Card,
	Dropdown,
	Typography,
} from "@heroui/react";
import { cn } from "@itsrose/react/core";
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
 * the bottom bar is attached to the writing surface so the actions always sit
 * with the script they submit. The outer card is transparent: the bordered
 * surface belongs to the editor itself, so the pane reads as a writing canvas
 * rather than a boxed widget.
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

	/** Inserts a direction tag where the caret is, without moving the script. */
	const insertTag = (tag: string) => {
		editor?.chain().focus().insertContent(tag).run();
	};

	return (
		<Card
			className="flex min-h-[32rem] flex-col gap-0 p-0"
			variant="transparent"
		>
			<Card.Content className="flex flex-1 flex-col overflow-hidden rounded-t-2xl border border-b-0 border-separator bg-surface p-0">
				<EditorContent className="flex-1" editor={editor} />
			</Card.Content>

			<Card.Footer className="flex flex-wrap items-center justify-between gap-3 rounded-b-2xl border border-separator bg-surface-secondary p-4">
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

				<div className="flex items-center gap-2">
					<Dropdown>
						<Dropdown.Trigger
							aria-label="Insert tag"
							className={cn(
								buttonVariants({
									size: "sm",
									variant: "ghost",
								}),
								"gap-1.5"
							)}
							isDisabled={!editor}
						>
							<span>Insert tag</span>
							<ChevronDown aria-hidden className="size-3.5" />
						</Dropdown.Trigger>

						<Dropdown.Popover
							className="min-w-44"
							placement="top end"
						>
							<Dropdown.Menu
								aria-label="Direction tags"
								onAction={(key) => insertTag(String(key))}
							>
								{SPEECH_DIRECTION_TAGS.map((tag) => (
									<Dropdown.Item
										key={tag}
										id={tag}
										textValue={tag}
									>
										{tag}
									</Dropdown.Item>
								))}
							</Dropdown.Menu>
						</Dropdown.Popover>
					</Dropdown>

					<Button
						isDisabled={!canGenerate || isGenerating}
						isPending={isGenerating}
						variant="primary"
						onPress={onGenerate}
					>
						<Sparkles aria-hidden className="size-4" />
						<span>Generate speech</span>
					</Button>
				</div>
			</Card.Footer>
		</Card>
	);
};

SpeechEditor.displayName = "SpeechEditor";
