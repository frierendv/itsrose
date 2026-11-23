import { toast } from "@heroui/react";
import { cleanup, screen, waitFor, within } from "@testing-library/react";
import { afterEach } from "vitest";
import { jsonResponse, mockFetch } from "./fetch-mock";
import {
	CLONED_VOICE,
	EXPIRED_ROW,
	failureEnvelope,
	GENERATION_ROW,
	generationsRoute,
	PREMADE_VOICE,
	renderSpeechPage,
	successEnvelope,
	UNAUTHORIZED_ENVELOPE,
	voicesRoute,
} from "./harness";

const GENERATIONS_PATH = "/studio/generations";
const SPEECH_PATH = "/studio/speech";

const GENERATED = {
	generation_id: "gen_new",
	audio_url: "https://r2.test/generated/gen_new.mp3",
	expires_at: "2026-11-21T08:00:00.000Z",
	saved: false,
};

/** Types into the Tiptap contenteditable once it has mounted. */
async function typeScript(
	user: ReturnType<typeof renderSpeechPage>["user"],
	text: string
): Promise<HTMLElement> {
	const editor = await screen.findByRole("textbox", {
		name: "Speech script",
	});

	editor.focus();
	await user.keyboard(text);

	return editor;
}

afterEach(() => {
	cleanup();
	toast.clear();
	vi.unstubAllGlobals();
});

describe("SpeechPage", () => {
	it("renders the grouped voice library and selects the first clone by default", async () => {
		mockFetch([
			voicesRoute([CLONED_VOICE, PREMADE_VOICE]),
			generationsRoute([]),
		]);

		renderSpeechPage();

		const clonedRow = await screen.findByRole("button", {
			name: /^Narrator/,
		});
		const premadeRow = screen.getByRole("button", { name: /^Aria/ });

		expect(clonedRow.getAttribute("aria-pressed")).toBe("true");
		expect(premadeRow.getAttribute("aria-pressed")).toBe("false");

		// The two groups are stated, in the clones-then-catalogue order.
		expect(screen.getByText("Your voices")).toBeTruthy();
		expect(screen.getByText("Catalogue")).toBeTruthy();

		// The bar names the selected voice, the counter is at zero, and an
		// empty script cannot generate.
		expect(screen.getByText("0/5000")).toBeTruthy();
		expect(
			(
				screen.getByRole("button", {
					name: /Generate speech/,
				}) as HTMLButtonElement
			).disabled
		).toBe(true);
	});

	it("updates the character count as the script is typed", async () => {
		mockFetch([voicesRoute([CLONED_VOICE]), generationsRoute([])]);

		const { user } = renderSpeechPage();

		expect(await screen.findByText("0/5000")).toBeTruthy();

		await typeScript(user, "Hello there.");

		await waitFor(() => {
			expect(screen.getByText("12/5000")).toBeTruthy();
		});
	});

	it("highlights bracketed direction tags in the live editor", async () => {
		mockFetch([voicesRoute([CLONED_VOICE]), generationsRoute([])]);

		const { user } = renderSpeechPage();

		const editor = await typeScript(user, "[[sighs] Now the line.");

		await waitFor(() => {
			const decoration = editor.querySelector(".speech-bracket-tag");

			expect(decoration).not.toBeNull();
			expect(decoration?.textContent).toBe("[sighs]");
			expect(decoration?.classList.contains("text-accent")).toBe(true);
			expect(decoration?.classList.contains("font-semibold")).toBe(true);
		});
	});

	it("generates speech with the typed text and plays the result", async () => {
		let generated = false;
		let requestBody: unknown;

		mockFetch([
			voicesRoute([CLONED_VOICE, PREMADE_VOICE]),
			{
				method: "GET",
				path: GENERATIONS_PATH,
				respond: () =>
					jsonResponse(
						successEnvelope({
							items: generated ? [GENERATION_ROW] : [],
							limit: 20,
							offset: 0,
						})
					),
			},
			{
				method: "POST",
				path: SPEECH_PATH,
				respond: ({ body }) => {
					requestBody = body;
					generated = true;
					return jsonResponse(successEnvelope(GENERATED));
				},
			},
		]);

		const { user } = renderSpeechPage();

		await typeScript(user, "Hello from the recorder.");
		await user.click(
			screen.getByRole("button", { name: /Generate speech/ })
		);

		await waitFor(() => {
			expect(requestBody).toEqual({
				text: "Hello from the recorder.",
				voice_id: CLONED_VOICE.voice_id,
			});
		});

		// The shared player received the generated audio…
		const player = await screen.findByLabelText("Audio player");
		expect(within(player).getByText("Generated speech")).toBeTruthy();
		expect(
			within(player).getByText("Hello from the recorder.")
		).toBeTruthy();
		expect(document.querySelector("audio")?.getAttribute("src")).toBe(
			GENERATED.audio_url
		);

		// …and the invalidated history refetched the new row once the History
		// tab, which is unmounted while Settings is showing, is opened.
		await user.click(screen.getByRole("tab", { name: "History" }));
		await screen.findByText("A saved line from the history.");
	});

	it("surfaces a 403 generation failure without starting playback", async () => {
		const forbidden = failureEnvelope(
			"Your plan does not allow speech generation.",
			{ plan: "upgrade_required" }
		);

		mockFetch([
			voicesRoute([CLONED_VOICE]),
			generationsRoute([]),
			{
				method: "POST",
				path: SPEECH_PATH,
				respond: () => jsonResponse(forbidden, 403),
			},
		]);

		const { user } = renderSpeechPage();

		await typeScript(user, "A forbidden line.");
		await user.click(
			screen.getByRole("button", { name: /Generate speech/ })
		);

		expect(
			await screen.findByText(
				"Your plan does not allow speech generation."
			)
		).toBeTruthy();
		expect(screen.queryByLabelText("Audio player")).toBeNull();
	});

	it("shows the voice library error with a retry that recovers", async () => {
		let voices = 0;

		mockFetch([
			{
				method: "GET",
				path: "/studio/voices",
				respond: () => {
					voices += 1;
					return voices === 1
						? jsonResponse(UNAUTHORIZED_ENVELOPE, 401)
						: jsonResponse(
								successEnvelope({ items: [CLONED_VOICE] })
							);
				},
			},
			generationsRoute([]),
		]);

		const { user } = renderSpeechPage();

		await screen.findByText("Could not load your voices");
		expect(
			screen.getByText(
				"A dashboard session is required to use the speech surface."
			)
		).toBeTruthy();

		await user.click(screen.getByRole("button", { name: "Retry" }));

		expect(
			await screen.findByRole("button", { name: /^Narrator/ })
		).toBeTruthy();
	});

	it("shows the history error with a retry that recovers", async () => {
		let generations = 0;

		mockFetch([
			voicesRoute([CLONED_VOICE]),
			{
				method: "GET",
				path: GENERATIONS_PATH,
				respond: () => {
					generations += 1;
					return generations === 1
						? jsonResponse(UNAUTHORIZED_ENVELOPE, 401)
						: jsonResponse(
								successEnvelope({
									items: [EXPIRED_ROW],
									limit: 20,
									offset: 0,
								})
							);
				},
			},
		]);

		const { user } = renderSpeechPage();

		await user.click(screen.getByRole("tab", { name: "History" }));
		await screen.findByText("Could not load your history");

		await user.click(screen.getByRole("button", { name: "Retry" }));

		expect(await screen.findByText("An expired line.")).toBeTruthy();
	});
});
