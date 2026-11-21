import { config } from "@/config";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Mock } from "vitest";
import { AssetsPage } from "../pages/assets-page";

type FetchLike = (
	input: RequestInfo | URL,
	init?: RequestInit
) => Promise<Response>;

const ASSET = {
	asset_id: "ast_01",
	kind: "voice_sample",
	filename: "sample.wav",
	size_bytes: 2048,
	content_type: "audio/wav",
	created_at: "2026-11-19T08:00:00.000Z",
};

const DELETE_URL = `${config.AUTH_BASE_URL}/assets/ast_01`;

function successEnvelope(data: unknown) {
	return {
		ok: true,
		code: 1000,
		message: "OK",
		data,
		errors: null,
		meta: {},
	};
}

function jsonResponse(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "content-type": "application/json" },
	});
}

let fetchMock: Mock<FetchLike>;

function renderPage(): QueryClient {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});

	render(
		<QueryClientProvider client={queryClient}>
			<AssetsPage />
		</QueryClientProvider>
	);

	return queryClient;
}

beforeEach(() => {
	let deleted = false;

	fetchMock = vi.fn<FetchLike>();
	fetchMock.mockImplementation(async (_input, init) => {
		if (init?.method === "DELETE") {
			deleted = true;
			return jsonResponse(successEnvelope({ deleted: true }));
		}
		return jsonResponse(
			successEnvelope({
				items: deleted ? [] : [ASSET],
				limit: 24,
				offset: 0,
			})
		);
	});

	vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("AssetsPage", () => {
	it("renders the asset rows returned by the list endpoint", async () => {
		renderPage();

		expect(await screen.findByText("sample.wav")).toBeTruthy();
		expect(screen.getByText("Voice sample")).toBeTruthy();
		expect(screen.getByText("2 KB")).toBeTruthy();
		expect(screen.getByText("19 Nov 2026")).toBeTruthy();
		expect(screen.getByText("Showing 1–1")).toBeTruthy();
	});

	it("deletes through the API and invalidates the cached list", async () => {
		const user = userEvent.setup();
		const queryClient = renderPage();
		const invalidate = vi.spyOn(queryClient, "invalidateQueries");

		await screen.findByText("sample.wav");

		await user.click(
			screen.getByRole("button", { name: "Delete sample.wav" })
		);

		// The confirmation dialog must be explicit about the deletion.
		await screen.findByText(/will be removed/);
		await user.click(screen.getByRole("button", { name: "Delete asset" }));

		await waitFor(() => {
			const deleteCall = fetchMock.mock.calls.find(
				([, init]) => init?.method === "DELETE"
			);
			expect(String(deleteCall?.[0])).toBe(DELETE_URL);
		});

		expect(invalidate).toHaveBeenCalledWith({
			queryKey: ["assets"],
		});

		// The invalidated list refetches, and the deleted row disappears.
		await waitFor(() => {
			expect(screen.queryByText("sample.wav")).toBeNull();
		});

		const listCalls = fetchMock.mock.calls.filter(
			([, init]) => (init?.method ?? "GET") === "GET"
		);
		expect(listCalls).toHaveLength(2);
	});
});
