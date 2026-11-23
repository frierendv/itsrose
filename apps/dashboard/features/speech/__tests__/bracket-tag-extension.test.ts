import { Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
	BRACKET_TAG_CLASS,
	BracketTagHighlight,
	findBracketTagRanges,
	findBracketTags,
} from "../components/editor/bracket-tag-extension";

/** The decoration selector the rendered editor uses. */
const DECORATION_SELECTOR = `.${BRACKET_TAG_CLASS}`;

function mountEditor(content: string): {
	editor: Editor;
	element: HTMLDivElement;
} {
	const element = document.createElement("div");
	document.body.append(element);

	const editor = new Editor({
		element,
		extensions: [StarterKit, BracketTagHighlight],
		content,
	});

	return { editor, element };
}

describe("findBracketTags", () => {
	it("finds every tag, in document order", () => {
		expect(findBracketTags("Hello [sighs] and then [whispers].")).toEqual([
			"[sighs]",
			"[whispers]",
		]);
	});

	it("keeps duplicate tags", () => {
		expect(findBracketTags("[sighs] pause [sighs]")).toEqual([
			"[sighs]",
			"[sighs]",
		]);
	});

	it("rejects empty, unterminated and multiline brackets", () => {
		expect(findBracketTags("[] [unterminated [sighs")).toEqual([]);
		expect(findBracketTags("[sighs")).toEqual([]);
		expect(findBracketTags("[one\ntwo]")).toEqual([]);
	});

	it("caps a tag at 40 characters between the brackets", () => {
		const forty = `[${"x".repeat(40)}]`;
		const fortyOne = `[${"x".repeat(41)}]`;

		expect(findBracketTags(forty)).toEqual([forty]);
		expect(findBracketTags(fortyOne)).toEqual([]);
	});

	it("reports offsets that slice back to the tag", () => {
		const text = "Hello [sighs] there";

		expect(findBracketTagRanges(text)).toEqual([{ from: 6, to: 13 }]);
	});
});

describe("BracketTagHighlight", () => {
	it("decorates a bracketed tag in the rendered editor", () => {
		const { editor, element } = mountEditor("<p>Hello [sighs] there</p>");

		try {
			const decoration = element.querySelector(DECORATION_SELECTOR);

			expect(decoration).not.toBeNull();
			expect(decoration?.textContent).toBe("[sighs]");
			expect(decoration?.classList.contains("text-accent")).toBe(true);
			expect(decoration?.classList.contains("font-semibold")).toBe(true);
			// The surrounding prose is not decorated.
			expect(element.textContent).toBe("Hello [sighs] there");
		} finally {
			editor.destroy();
			element.remove();
		}
	});

	it("re-scans the document when the content changes", () => {
		const { editor, element } = mountEditor("<p>Hello there</p>");

		try {
			expect(element.querySelector(DECORATION_SELECTOR)).toBeNull();

			editor.commands.setContent("<p>[whispers] hello [sighs]</p>");

			const decorations = element.querySelectorAll(DECORATION_SELECTOR);
			expect([...decorations].map((node) => node.textContent)).toEqual([
				"[whispers]",
				"[sighs]",
			]);
		} finally {
			editor.destroy();
			element.remove();
		}
	});
});
