import { config } from "@/config";
import { toast } from "@heroui/react";
import { cleanup, screen, waitFor, within } from "@testing-library/react";
import { delay, http, HttpResponse } from "msw";
import { afterEach, vi } from "vitest";
import { server } from "../../../__tests__/msw/server";
import { SettingsPanel } from "../components/settings-panel";
import {
	CLONED_VOICE,
	failureEnvelope,
	PREMADE_VOICE,
	renderInSpeechProviders,
	successEnvelope,
	voicesHandler,
} from "./harness";

const ASSETS_URL = `${config.AUTH_BASE_URL}/assets`;

afterEach(() => {
	cleanup();
	toast.clear();
});

describe("SettingsPanel", () => {
	it("previews a premade voice from its catalogue url", async () => {
		server.use(voicesHandler([CLONED_VOICE, PREMADE_VOICE]));

		const { user } = renderInSpeechProviders(
			<SettingsPanel
				selectedVoiceId={PREMADE_VOICE.voice_id}
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
			PREMADE_VOICE.preview_url
		);
	});

	it("previews a clone through a signed asset url", async () => {
		const signedUrl = "https://storage.test/signed/ast_01";
		let assetUrl = "";

		server.use(
			voicesHandler([CLONED_VOICE]),
			http.get(
				`${ASSETS_URL}/${CLONED_VOICE.sample_asset_id}/url`,
				() => {
					assetUrl = `${ASSETS_URL}/${CLONED_VOICE.sample_asset_id}/url`;
					return HttpResponse.json(
						successEnvelope({ url: signedUrl, expires_in: 900 })
					);
				}
			)
		);

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

		await waitFor(() => {
			expect(assetUrl).toBe(
				`${ASSETS_URL}/${CLONED_VOICE.sample_asset_id}/url`
			);
		});
		await screen.findByText("Voice preview");
		expect(document.querySelector("audio")?.getAttribute("src")).toBe(
			signedUrl
		);
	});

	it("disables preview when the voice has no source", async () => {
		const withoutSample = { ...CLONED_VOICE, sample_asset_id: null };
		const withoutPreview = { ...PREMADE_VOICE, preview_url: null };

		server.use(voicesHandler([withoutSample, withoutPreview]));

		renderInSpeechProviders(
			<SettingsPanel selectedVoiceId={null} onSelectVoice={vi.fn()} />
		);

		const clonePreview = await screen.findByRole("button", {
			name: "Preview Narrator",
		});
		const premadePreview = screen.getByRole("button", {
			name: "Preview Aria",
		});

		// The clone's sample_asset_id is null and the premade's preview_url is
		// null, so neither has anything to audition.
		expect((clonePreview as HTMLButtonElement).disabled).toBe(true);
		expect((premadePreview as HTMLButtonElement).disabled).toBe(true);
	});

	it("selects a voice through the list", async () => {
		const onSelectVoice = vi.fn();

		server.use(voicesHandler([CLONED_VOICE, PREMADE_VOICE]));

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
		server.use(
			http.get(`${config.AUTH_BASE_URL}/studio/voices`, async () => {
				await delay(50);
				return HttpResponse.json(successEnvelope({ items: [] }));
			})
		);

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

		server.use(
			http.get(`${config.AUTH_BASE_URL}/studio/voices`, () => {
				requests += 1;
				return requests === 1
					? HttpResponse.json(
							failureEnvelope(
								"The voice library request failed."
							),
							{ status: 401 }
						)
					: HttpResponse.json(
							successEnvelope({ items: [CLONED_VOICE] })
						);
			})
		);

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
