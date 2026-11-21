import { toast } from "@heroui/react";
import { cleanup, screen, within } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import { SettingsPanel } from "../components/settings-panel";
import { jsonResponse, mockFetch } from "./fetch-mock";
import {
	CLONED_VOICE,
	failureEnvelope,
	PREMADE_VOICE,
	PREMADE_VOICE_WITH_PREVIEW,
	renderInSpeechProviders,
	successEnvelope,
	voicesRoute,
} from "./harness";

const ASSET_URL_PATH = `/assets/${CLONED_VOICE.sample_asset_id}/url`;

afterEach(() => {
	cleanup();
	toast.clear();
	vi.unstubAllGlobals();
});

describe("SettingsPanel", () => {
	it("previews a premade voice from its catalogue url", async () => {
		mockFetch([voicesRoute([CLONED_VOICE, PREMADE_VOICE_WITH_PREVIEW])]);

		const { user } = renderInSpeechProviders(
			<SettingsPanel
				selectedVoiceId={PREMADE_VOICE_WITH_PREVIEW.voice_id}
				onSelectVoice={vi.fn()}
			/>
		);

		await user.click(
			await screen.findByRole("button", { name: "Preview Aria" })
		);

		const player = await screen.findByLabelText("Audio player");
		expect(within(player).getByText("Voice preview")).toBeTruthy();
		expect(within(player).getByText("Aria")).toBeTruthy();
		expect(document.querySelector("audio")?.getAttribute("src")).toBe(
			PREMADE_VOICE_WITH_PREVIEW.preview_url
		);
	});

	it("previews a clone through a signed asset url", async () => {
		const signedUrl = "https://storage.test/signed/ast_01";

		mockFetch([
			voicesRoute([CLONED_VOICE]),
			{
				method: "GET",
				path: ASSET_URL_PATH,
				respond: () =>
					jsonResponse(
						successEnvelope({ url: signedUrl, expires_in: 900 })
					),
			},
		]);

		const { user } = renderInSpeechProviders(
			<SettingsPanel
				selectedVoiceId={CLONED_VOICE.voice_id}
				onSelectVoice={vi.fn()}
			/>
		);

		await user.click(
			await screen.findByRole("button", {
				name: "Preview Narrator",
			})
		);

		await screen.findByText("Voice preview");
		expect(document.querySelector("audio")?.getAttribute("src")).toBe(
			signedUrl
		);
	});

	it("disables preview when the voice has no source", async () => {
		const withoutSample = { ...CLONED_VOICE, sample_asset_id: null };

		// The existing API omits `preview_url` on a premade voice without a
		// preview; the panel must read the absent field as "nothing to play".
		mockFetch([voicesRoute([withoutSample, PREMADE_VOICE])]);

		renderInSpeechProviders(
			<SettingsPanel selectedVoiceId={null} onSelectVoice={vi.fn()} />
		);

		const clonePreview = await screen.findByRole("button", {
			name: "Preview Narrator",
		});
		const premadePreview = screen.getByRole("button", {
			name: "Preview Aria",
		});

		expect((clonePreview as HTMLButtonElement).disabled).toBe(true);
		expect((premadePreview as HTMLButtonElement).disabled).toBe(true);
	});

	it("selects a voice through the list", async () => {
		const onSelectVoice = vi.fn();

		mockFetch([voicesRoute([CLONED_VOICE, PREMADE_VOICE])]);

		const { user } = renderInSpeechProviders(
			<SettingsPanel
				selectedVoiceId={CLONED_VOICE.voice_id}
				onSelectVoice={onSelectVoice}
			/>
		);

		await user.click(await screen.findByRole("button", { name: /^Aria/ }));

		expect(onSelectVoice).toHaveBeenCalledWith(PREMADE_VOICE.voice_id);
	});

	it("shows a loading state, then the empty state", async () => {
		mockFetch([
			{
				method: "GET",
				path: "/studio/voices",
				respond: async () => {
					await new Promise((resolve) => setTimeout(resolve, 50));
					return jsonResponse(successEnvelope({ items: [] }));
				},
			},
		]);

		renderInSpeechProviders(
			<SettingsPanel selectedVoiceId={null} onSelectVoice={vi.fn()} />
		);

		expect(
			screen.getByRole("status", { name: "Loading voices" })
		).toBeTruthy();
		expect(
			await screen.findByText(/No voices are available yet/)
		).toBeTruthy();
	});

	it("shows the list error with a retry that refetches", async () => {
		let requests = 0;

		mockFetch([
			{
				method: "GET",
				path: "/studio/voices",
				respond: () => {
					requests += 1;
					return requests === 1
						? jsonResponse(
								failureEnvelope(
									"The voice library request failed."
								),
								401
							)
						: jsonResponse(
								successEnvelope({ items: [CLONED_VOICE] })
							);
				},
			},
		]);

		const { user } = renderInSpeechProviders(
			<SettingsPanel selectedVoiceId={null} onSelectVoice={vi.fn()} />
		);

		expect(
			await screen.findByText("Could not load your voices")
		).toBeTruthy();

		await user.click(screen.getByRole("button", { name: "Retry" }));

		expect(
			await screen.findByRole("button", { name: /^Narrator/ })
		).toBeTruthy();
	});
});
