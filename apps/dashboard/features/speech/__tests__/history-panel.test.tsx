import { config } from "@/config";
import { toast } from "@heroui/react";
import { cleanup, screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { afterEach } from "vitest";
import { server } from "../../../__tests__/msw/server";
import { HistoryPanel } from "../components/history-panel";
import {
	failureEnvelope,
	GENERATION_ROW,
	generationsHandler,
	renderInSpeechProviders,
	successEnvelope,
} from "./harness";

const GENERATIONS_URL = `${config.AUTH_BASE_URL}/studio/generations`;

function row(index: number) {
	return {
		...GENERATION_ROW,
		generation_id: `gen_${index}`,
		input_text: `Generation ${index}`,
		created_at: `2026-11-20T08:${String(index).padStart(2, "0")}:00.000Z`,
	};
}

afterEach(() => {
	cleanup();
	toast.clear();
});

describe("HistoryPanel", () => {
	it("paginates with offset and reports the visible range", async () => {
		const requestedOffsets: string[] = [];

		server.use(
			http.get(GENERATIONS_URL, ({ request }) => {
				const url = new URL(request.url);
				const offset = url.searchParams.get("offset") ?? "0";
				requestedOffsets.push(offset);

				return HttpResponse.json(
					successEnvelope({
						items: Array.from({ length: 20 }, (_, index) =>
							row(Number(offset) + index + 1)
						),
						limit: 20,
						offset: Number(offset),
					})
				);
			})
		);

		const { user } = renderInSpeechProviders(<HistoryPanel />);

		expect(await screen.findByText("Showing 1–20")).toBeTruthy();

		const next = screen.getByRole("button", { name: "Next" });
		expect((next as HTMLButtonElement).disabled).toBe(false);

		await user.click(next);

		await waitFor(() => {
			expect(requestedOffsets).toContain("20");
		});
		expect(await screen.findByText("Showing 21–40")).toBeTruthy();
	});

	it("disables play and hides save on expired and saved rows", async () => {
		const expired = {
			...GENERATION_ROW,
			generation_id: "gen_expired",
			input_text: "An expired line.",
			expired: true,
		};
		const saved = {
			...GENERATION_ROW,
			generation_id: "gen_saved",
			input_text: "An already saved line.",
			saved: true,
			asset_id: "ast_saved",
		};
		const playable = {
			...GENERATION_ROW,
			generation_id: "gen_playable",
			input_text: "A playable line.",
		};

		server.use(generationsHandler([expired, saved, playable]));

		renderInSpeechProviders(<HistoryPanel />);

		// The expired row still lists, with its chip, but cannot play.
		const playExpired = await screen.findByRole("button", {
			name: "Play An expired line.",
		});
		expect((playExpired as HTMLButtonElement).disabled).toBe(true);
		expect(screen.getByText("Expired")).toBeTruthy();

		// A saved row shows its chip and has no save action left.
		expect(screen.getByText("Saved")).toBeTruthy();
		expect(
			screen.queryByRole("button", {
				name: "Save An already saved line.",
			})
		).toBeNull();
		expect(
			screen.queryByRole("button", {
				name: "Save An expired line.",
			})
		).toBeNull();

		// An unsaved, live row keeps both actions.
		expect(
			screen.getByRole("button", {
				name: "Save A playable line.",
			})
		).toBeTruthy();
		expect(
			screen.getByRole("button", {
				name: "Play A playable line.",
			})
		).toBeTruthy();
	});

	it("explains a 410 on play and refetches the page", async () => {
		let listRequests = 0;

		server.use(
			http.get(GENERATIONS_URL, () => {
				listRequests += 1;
				return HttpResponse.json(
					successEnvelope({
						items: [GENERATION_ROW],
						limit: 20,
						offset: 0,
					})
				);
			}),
			http.get(
				`${GENERATIONS_URL}/${GENERATION_ROW.generation_id}/url`,
				() =>
					HttpResponse.json(
						failureEnvelope(
							"The generation has expired and is no longer available."
						),
						{ status: 410 }
					)
			)
		);

		const { user } = renderInSpeechProviders(<HistoryPanel />);

		await user.click(
			await screen.findByRole("button", {
				name: /^Play A saved line/,
			})
		);

		expect(await screen.findByText("Generation expired")).toBeTruthy();
		expect(
			screen.getByText(/Its audio is no longer available/)
		).toBeTruthy();
		expect(screen.queryByLabelText("Audio player")).toBeNull();

		await waitFor(() => {
			expect(listRequests).toBeGreaterThanOrEqual(2);
		});
	});

	it("saves under an automatic tts-date filename", async () => {
		let saveUrl = "";
		let saveBody: unknown;

		server.use(
			generationsHandler([GENERATION_ROW]),
			http.post(
				`${GENERATIONS_URL}/${GENERATION_ROW.generation_id}/save`,
				async ({ request }) => {
					saveUrl = request.url;
					saveBody = await request.json();
					return HttpResponse.json(
						successEnvelope({
							asset_id: "ast_saved",
							saved: true,
						})
					);
				}
			)
		);

		const { user } = renderInSpeechProviders(<HistoryPanel />);

		await user.click(
			await screen.findByRole("button", {
				name: /^Save A saved line/,
			})
		);

		await waitFor(() => {
			expect(saveBody).toEqual({ filename: "tts-2026-11-20" });
		});
		expect(saveUrl).toBe(
			`${GENERATIONS_URL}/${GENERATION_ROW.generation_id}/save`
		);
	});

	it("confirms deletion and keeps the saved asset", async () => {
		let deleted = false;
		let deleteMethod = "";

		server.use(
			http.get(GENERATIONS_URL, () =>
				HttpResponse.json(
					successEnvelope({
						items: deleted ? [] : [GENERATION_ROW],
						limit: 20,
						offset: 0,
					})
				)
			),
			http.delete(
				`${GENERATIONS_URL}/${GENERATION_ROW.generation_id}`,
				({ request }) => {
					deleted = true;
					deleteMethod = request.method;
					return HttpResponse.json(
						successEnvelope({ deleted: true })
					);
				}
			)
		);

		const { user } = renderInSpeechProviders(<HistoryPanel />);

		await user.click(
			await screen.findByRole("button", {
				name: /^Delete A saved line/,
			})
		);

		// The confirmation states that a saved asset survives the delete.
		const dialog = await screen.findByRole("dialog");
		expect(
			within(dialog).getByText(/stays in your asset library/)
		).toBeTruthy();

		await user.click(
			within(dialog).getByRole("button", {
				name: "Delete generation",
			})
		);

		await waitFor(() => {
			expect(deleteMethod).toBe("DELETE");
		});
		await waitFor(() => {
			expect(
				screen.queryByText("A saved line from the history.")
			).toBeNull();
		});
	});
});
