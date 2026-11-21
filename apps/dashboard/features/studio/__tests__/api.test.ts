import { config } from "@/config";
import { ApiError } from "@/lib/api/envelope";
import type { Mock } from "vitest";
import {
	deleteGeneration,
	generateSpeech,
	getGenerationUrl,
	listGenerations,
	saveGeneration,
} from "../api";

type FetchLike = (
	input: RequestInfo | URL,
	init?: RequestInit
) => Promise<Response>;

const SPEECH = {
	generation_id: "gen_01",
	audio_url: "https://r2.example/generated/gen_01.mp3",
	expires_at: "2026-11-21T08:00:00.000Z",
	saved: false,
};

const GENERATION = {
	generation_id: "gen_01",
	feature: "text_to_speech",
	status: "completed",
	input_text: "Hello there.",
	created_at: "2026-11-20T08:00:00.000Z",
	expires_at: "2026-11-21T08:00:00.000Z",
	saved: false,
	asset_id: null,
	expired: false,
};

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

function failureEnvelope() {
	return {
		ok: false,
		code: 4001,
		message: "A dashboard session is required to use the studio.",
		data: null,
		errors: { session: "Sign in and retry." },
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

function firstCall(): { url: string; init: RequestInit } {
	const call = fetchMock.mock.calls.at(0);
	if (!call) {
		throw new Error("fetch was not called");
	}
	return { url: String(call[0]), init: call[1] ?? {} };
}

function headersOf(init: RequestInit): Headers {
	return new Headers(init.headers);
}

beforeEach(() => {
	fetchMock = vi.fn<FetchLike>();
	vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("generateSpeech", () => {
	it("posts the speech body to the studio route with the session", async () => {
		fetchMock.mockResolvedValue(jsonResponse(successEnvelope(SPEECH)));

		await expect(
			generateSpeech({ text: "Hello there.", voice_id: "voice_01" })
		).resolves.toEqual(SPEECH);

		const { url, init } = firstCall();
		expect(url).toBe(`${config.AUTH_BASE_URL}/studio/speech`);
		expect(init.method).toBe("POST");
		expect(init.credentials).toBe("include");
		expect(init.body).toBe(
			JSON.stringify({ text: "Hello there.", voice_id: "voice_01" })
		);

		const headers = headersOf(init);
		expect(headers.get("accept")).toBe("application/json");
		expect(headers.get("content-type")).toBe("application/json");
	});

	it("sends the optional provider hints when supplied", async () => {
		fetchMock.mockResolvedValue(jsonResponse(successEnvelope(SPEECH)));

		await generateSpeech({
			text: "Hello there.",
			voice_id: "voice_01",
			model_id: "eleven_multilingual_v2",
			output_format: "mp3_44100_128",
		});

		expect(JSON.parse(String(firstCall().init.body))).toEqual({
			text: "Hello there.",
			voice_id: "voice_01",
			model_id: "eleven_multilingual_v2",
			output_format: "mp3_44100_128",
		});
	});

	it("forwards the cookie for the server-side prefetch", async () => {
		fetchMock.mockResolvedValue(jsonResponse(successEnvelope(SPEECH)));

		await generateSpeech(
			{ text: "Hello there.", voice_id: "voice_01" },
			{ headers: { cookie: "better-auth.session_token=abc" } }
		);

		expect(headersOf(firstCall().init).get("cookie")).toBe(
			"better-auth.session_token=abc"
		);
	});
});

describe("listGenerations", () => {
	it("requests a page with the feature and pagination query", async () => {
		fetchMock.mockResolvedValue(
			jsonResponse(
				successEnvelope({ items: [GENERATION], limit: 20, offset: 40 })
			)
		);

		const page = await listGenerations({
			feature: "text_to_speech",
			limit: 20,
			offset: 40,
		});

		expect(page.items).toEqual([GENERATION]);
		const { url, init } = firstCall();
		expect(url).toBe(
			`${config.AUTH_BASE_URL}/studio/generations?feature=text_to_speech&limit=20&offset=40`
		);
		expect(init.method).toBe("GET");
		expect(init.credentials).toBe("include");
	});

	it("omits the query when no pagination is requested", async () => {
		fetchMock.mockResolvedValue(
			jsonResponse(successEnvelope({ items: [], limit: 20, offset: 0 }))
		);

		await listGenerations();

		expect(firstCall().url).toBe(
			`${config.AUTH_BASE_URL}/studio/generations`
		);
	});

	it("forwards request headers for the server-side prefetch", async () => {
		fetchMock.mockResolvedValue(
			jsonResponse(successEnvelope({ items: [], limit: 20, offset: 0 }))
		);

		await listGenerations(
			{ limit: 20, offset: 0 },
			{ headers: { cookie: "better-auth.session_token=abc" } }
		);

		expect(headersOf(firstCall().init).get("cookie")).toBe(
			"better-auth.session_token=abc"
		);
	});
});

describe("getGenerationUrl", () => {
	it("requests the signed URL for one generation", async () => {
		fetchMock.mockResolvedValue(
			jsonResponse(
				successEnvelope({
					url: "https://r2.example/x",
					expires_in: 900,
					source: "generated",
				})
			)
		);

		await expect(getGenerationUrl("gen_01")).resolves.toEqual({
			url: "https://r2.example/x",
			expires_in: 900,
			source: "generated",
		});

		const { url, init } = firstCall();
		expect(url).toBe(
			`${config.AUTH_BASE_URL}/studio/generations/gen_01/url`
		);
		expect(init.method).toBe("GET");
	});

	it("encodes the generation id", async () => {
		fetchMock.mockResolvedValue(
			jsonResponse(
				successEnvelope({
					url: "https://r2.example/x",
					expires_in: 900,
					source: "library",
				})
			)
		);

		await getGenerationUrl("gen/01");

		expect(firstCall().url).toBe(
			`${config.AUTH_BASE_URL}/studio/generations/gen%2F01/url`
		);
	});
});

describe("saveGeneration", () => {
	it("posts the filename to the save route", async () => {
		fetchMock.mockResolvedValue(
			jsonResponse(successEnvelope({ asset_id: "ast_01", saved: true }))
		);

		await expect(
			saveGeneration("gen_01", { filename: "clip.mp3" })
		).resolves.toEqual({ asset_id: "ast_01", saved: true });

		const { url, init } = firstCall();
		expect(url).toBe(
			`${config.AUTH_BASE_URL}/studio/generations/gen_01/save`
		);
		expect(init.method).toBe("POST");
		expect(init.body).toBe(JSON.stringify({ filename: "clip.mp3" }));
		expect(headersOf(init).get("content-type")).toBe("application/json");
	});

	it("sends an empty body when the API should derive the filename", async () => {
		fetchMock.mockResolvedValue(
			jsonResponse(
				successEnvelope({
					asset_id: "ast_01",
					saved: true,
					already_saved: true,
				})
			)
		);

		await saveGeneration("gen/01");

		const { url, init } = firstCall();
		expect(url).toBe(
			`${config.AUTH_BASE_URL}/studio/generations/gen%2F01/save`
		);
		expect(init.body).toBe("{}");
	});
});

describe("deleteGeneration", () => {
	it("deletes one generation", async () => {
		fetchMock.mockResolvedValue(
			jsonResponse(successEnvelope({ deleted: true }))
		);

		await expect(deleteGeneration("gen_01")).resolves.toEqual({
			deleted: true,
		});

		const { url, init } = firstCall();
		expect(url).toBe(`${config.AUTH_BASE_URL}/studio/generations/gen_01`);
		expect(init.method).toBe("DELETE");
	});

	it("encodes the generation id", async () => {
		fetchMock.mockResolvedValue(
			jsonResponse(successEnvelope({ deleted: true }))
		);

		await deleteGeneration("gen/01");

		expect(firstCall().url).toBe(
			`${config.AUTH_BASE_URL}/studio/generations/gen%2F01`
		);
	});
});

describe("studio failures", () => {
	it("throws the envelope message and diagnostics", async () => {
		fetchMock.mockResolvedValue(jsonResponse(failureEnvelope(), 401));

		const error = await listGenerations().catch((cause: unknown) => cause);

		expect(error).toBeInstanceOf(ApiError);
		expect(error).toMatchObject({
			message: "A dashboard session is required to use the studio.",
			status: 401,
			code: 4001,
			errors: { session: "Sign in and retry." },
		});
	});

	it("names the studio surface when the body is not an envelope", async () => {
		fetchMock.mockResolvedValue(
			new Response("<html>502 Bad Gateway</html>", { status: 502 })
		);

		await expect(listGenerations()).rejects.toThrow(
			/The studio API returned an unexpected response \(HTTP 502\)\./
		);
	});
});
