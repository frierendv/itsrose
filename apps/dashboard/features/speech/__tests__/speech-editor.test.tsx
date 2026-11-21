import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, vi } from "vitest";
import { SpeechEditor } from "../components/editor/speech-editor";

afterEach(cleanup);

function renderEditor(
	overrides: Partial<Parameters<typeof SpeechEditor>[0]> = {}
) {
	return render(
		<SpeechEditor
			canGenerate={false}
			characters={0}
			isGenerating={false}
			voiceName={null}
			onChange={vi.fn()}
			onGenerate={vi.fn()}
			{...overrides}
		/>
	);
}

describe("SpeechEditor", () => {
	it("mounts a plain-text editor with the speech placeholder", async () => {
		renderEditor();

		const editor = await screen.findByRole("textbox", {
			name: "Speech script",
		});
		const emptyParagraph = editor.querySelector("p");

		expect(emptyParagraph?.getAttribute("data-placeholder")).toBe(
			"Type or paste text to generate speech…"
		);
		// The document is one plain paragraph: the restricted StarterKit has no
		// heading, list, quote, code-block or mark nodes to produce.
		const blocks = editor.querySelectorAll(":scope > *");
		expect(blocks).toHaveLength(1);
		expect(blocks[0]?.tagName).toBe("P");
		expect(
			editor.querySelector(
				"h1, h2, ul, ol, blockquote, pre, hr, strong, em"
			)
		).toBeNull();
	});

	it("shows the counter, the limit state and the selected voice", async () => {
		renderEditor({
			characters: 5001,
			voiceName: "Narrator",
			canGenerate: false,
		});

		const counter = await screen.findByText("5001/5000");
		expect(counter.classList.contains("text-danger")).toBe(true);
		expect(screen.getByText("Narrator")).toBeTruthy();
		expect(
			(
				screen.getByRole("button", {
					name: /Generate speech/,
				}) as HTMLButtonElement
			).disabled
		).toBe(true);
	});

	it("shows a pending generate button and a no-voice state", async () => {
		renderEditor({
			characters: 12,
			voiceName: null,
			canGenerate: true,
			isGenerating: true,
		});

		expect(await screen.findByText("No voice selected")).toBeTruthy();
		expect(
			screen.getByRole("button", { name: /Generate speech/ })
		).toBeTruthy();
	});

	it("inserts a direction tag at the caret through the insert-tag menu", async () => {
		const user = userEvent.setup();

		renderEditor();

		const editor = await screen.findByRole("textbox", {
			name: "Speech script",
		});

		editor.focus();
		await user.keyboard("Now the line.");

		await user.click(screen.getByRole("button", { name: "Insert tag" }));
		await user.click(
			await screen.findByRole("menuitem", { name: "[sighs]" })
		);

		await waitFor(() => {
			expect(editor.textContent).toContain("Now the line.[sighs]");
		});

		// The inserted tag is decorated exactly like one that was typed.
		const decoration = editor.querySelector(".speech-bracket-tag");
		expect(decoration).not.toBeNull();
		expect(decoration?.textContent).toBe("[sighs]");
	});
});
