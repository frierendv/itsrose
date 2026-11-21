import Placeholder from "@tiptap/extension-placeholder";
import { Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

/**
 * The speech editor is built in the next stage; this suite only proves that
 * the pinned Tiptap packages resolve and initialise under the dashboard's
 * jsdom test environment. Without it the dependencies would be declared but
 * unexercised until the editor lands.
 */
describe("speech editor dependencies", () => {
	it("initialises the pinned tiptap packages headlessly", () => {
		const editor = new Editor({
			element: document.createElement("div"),
			extensions: [
				StarterKit,
				Placeholder.configure({ placeholder: "Write a script…" }),
			],
			content: "<p>Hello there.</p>",
		});

		try {
			expect(editor.getHTML()).toBe("<p>Hello there.</p>");
			expect(
				editor.extensionManager.extensions.some(
					(extension) => extension.name === "placeholder"
				)
			).toBe(true);
		} finally {
			editor.destroy();
		}
	});
});
