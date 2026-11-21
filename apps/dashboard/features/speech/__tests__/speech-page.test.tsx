import { config } from "@/config";
import { toast } from "@heroui/react";
import { cleanup, screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { afterEach } from "vitest";
import { server } from "../../../__tests__/msw/server";
import {
	CLONED_VOICE,
	EXPIRED_ROW,
	failureEnvelope,
	GENERATION_ROW,
	generationsHandler,
	PREMADE_VOICE,
	renderSpeechPage,
	successEnvelope,
	UNAUTHORIZED_ENVELOPE,
	voicesHandler,
} from "./harness";

const SPEECH_URL = `${config.AUTH_BASE_URL}/studio/speech`;
const VOICES_URL = `${config.AUTH_BASE_URL}/studio/voices`;

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

	await user.click(editor);
	await user.type(editor, text);

	return editor;
}

afterEach(() => {
	cleanup();
	toast.clear();
});

describe("SpeechPage", () => {
	it("renders the grouped voice library and selects the first clone by default", async () => {
		server.use(
			voicesHandler([CLONED_VOICE, PREMADE_VOICE]),
			generationsHandler([])
		);

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
		server.use(voicesHandler([CLONED_VOICE]), generationsHandler([]));

		const { user } = renderSpeechPage();

		expect(await screen.findByText("0/5000")).toBeTruthy();

		await typeScript(user, "Hello there.");

		await waitFor(() => {
			expect(screen.getByText("12/5000")).toBeTruthy();
		});
	});

	it("highlights bracketed direction tags in the live editor", async () => {
		server.use(voicesHandler([CLONED_VOICE]), generationsHandler([]));

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

		server.use(
			voicesHandler([CLONED_VOICE, PREMADE_VOICE]),
			http.get(`${config.AUTH_BASE_URL}/studio/generations`, () =>
				HttpResponse.json(
					successEnvelope({
						items: generated ? [GENERATION_ROW] : [],
						limit: 20,
						offset: 0,
					})
				)
			),
			http.post(SPEECH_URL, async ({ request }) => {
				requestBody = await request.json();
				generated = true;
				return HttpResponse.json(successEnvelope(GENERATED));
			})
		);

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

		// …and the invalidated history refetched the new row.
		await screen.findByText("A saved line from the history.");
	});

	it("surfaces a 403 generation failure without starting playback", async () => {
		const forbidden = failureEnvelope(
			"Your plan does not allow speech generation.",
			{ plan: "upgrade_required" }
		);

		server.use(
			voicesHandler([CLONED_VOICE]),
			generationsHandler([]),
			http.post(SPEECH_URL, () =>
				HttpResponse.json(forbidden, { status: 403 })
			)
		);

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
		server.use(
			http.get(VOICES_URL, () =>
				HttpResponse.json(UNAUTHORIZED_ENVELOPE, { status: 401 })
			),
			generationsHandler([])
		);

		const { user } = renderSpeechPage();

		await screen.findByText("Could not load your voices");
		expect(
			screen.getByText(
				"A dashboard session is required to use the speech surface."
			)
		).toBeTruthy();

		server.use(voicesHandler([CLONED_VOICE]), generationsHandler([]));
		await user.click(screen.getByRole("button", { name: "Retry" }));

		expect(
			await screen.findByRole("button", { name: /^Narrator/ })
		).toBeTruthy();
	});

	it("shows the history error with a retry that recovers", async () => {
		server.use(
			voicesHandler([CLONED_VOICE]),
			http.get(`${config.AUTH_BASE_URL}/studio/generations`, () =>
				HttpResponse.json(UNAUTHORIZED_ENVELOPE, { status: 401 })
			)
		);

		const { user } = renderSpeechPage();

		await screen.findByText("Could not load your history");

		server.use(
			voicesHandler([CLONED_VOICE]),
			generationsHandler([EXPIRED_ROW])
		);
		await user.click(screen.getByRole("button", { name: "Retry" }));

		expect(await screen.findByText("An expired line.")).toBeTruthy();
	});
});
