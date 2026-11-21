import { config } from "@/config";
import { ApiError } from "@/lib/api/envelope";
import type { Mock } from "vitest";
import {
	createVoice,
	createVoiceFromFile,
	deleteVoice,
	listVoices,
} from "../api";

type FetchLike = (
	input: RequestInfo | URL,
	init?: RequestInit
) => Promise<Response>;

const CLONED = {
	voice_id: "voice_01",
	name: "Narrator",
	source: "cloned",
	resource_id: "res_01",
	sample_asset_id: "ast_01",
	created_at: "2026-11-20T08:00:00.000Z",
};

const PREMADE = {
	voice_id: "voice_premade_01",
	name: "Aria",
	source: "premade",
	preview_url: "https://storage.test/preview/aria.mp3",
};

const ASSET = {
	asset_id: "ast_01",
	kind: "voice_sample",
	filename: "sample.wav",
	size_bytes: 2048,
	content_type: "audio/wav",
	created_at: "2026-11-20T08:00:00.000Z",
};

const CREATED = {
	resource_id: "res_01",
	voice_id: "voice_01",
	name: "Narrator",
	sample_asset_id: "ast_01",
};

const FILE = new File(["hello"], "hello.wav", { type: "audio/wav" });

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
		message: "The sample asset could not be uploaded.",
		data: null,
		errors: { upload: "Send a multipart form with `kind` and `file`." },
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

function callAt(index: number): { url: string; init: RequestInit } {
	const call = fetchMock.mock.calls.at(index);
	if (!call) {
		throw new Error(`fetch call ${index} was not made`);
	}
	return { url: String(call[0]), init: call[1] ?? {} };
}

function firstCall(): { url: string; init: RequestInit } {
	return callAt(0);
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

describe("listVoices", () => {
	it("requests the voice library with the session", async () => {
		fetchMock.mockResolvedValue(
			jsonResponse(successEnvelope({ items: [CLONED, PREMADE] }))
		);

		const list = await listVoices();

		expect(list.items).toEqual([CLONED, PREMADE]);
		const { url, init } = firstCall();
		expect(url).toBe(`${config.AUTH_BASE_URL}/studio/voices`);
		expect(init.method).toBe("GET");
		expect(init.credentials).toBe("include");
	});

	it("forwards request headers for the server-side prefetch", async () => {
		fetchMock.mockResolvedValue(
			jsonResponse(successEnvelope({ items: [] }))
		);

		await listVoices({
			headers: { cookie: "better-auth.session_token=abc" },
		});

		expect(headersOf(firstCall().init).get("cookie")).toBe(
			"better-auth.session_token=abc"
		);
	});
});

describe("createVoice", () => {
	it("posts the snake_case clone body to the server route", async () => {
		fetchMock.mockResolvedValue(jsonResponse(successEnvelope(CREATED)));

		await expect(
			createVoice({
				asset_id: "ast_01",
				name: "Narrator",
				description: "Calm narration.",
			})
		).resolves.toEqual(CREATED);

		const { url, init } = firstCall();
		expect(url).toBe(`${config.AUTH_BASE_URL}/studio/voices`);
		expect(init.method).toBe("POST");
		expect(init.body).toBe(
			JSON.stringify({
				asset_id: "ast_01",
				name: "Narrator",
				description: "Calm narration.",
			})
		);
		expect(headersOf(init).get("content-type")).toBe("application/json");
	});
});

describe("deleteVoice", () => {
	it("deletes one voice through the root voice route", async () => {
		fetchMock.mockResolvedValue(
			jsonResponse(successEnvelope({ deleted: true }))
		);

		await expect(deleteVoice("voice_01")).resolves.toEqual({
			deleted: true,
		});

		const { url, init } = firstCall();
		expect(url).toBe(`${config.AUTH_BASE_URL}/voices/voice_01`);
		expect(init.method).toBe("DELETE");
	});

	it("encodes the voice id", async () => {
		fetchMock.mockResolvedValue(
			jsonResponse(successEnvelope({ deleted: true }))
		);

		await deleteVoice("voice/01");

		expect(firstCall().url).toBe(
			`${config.AUTH_BASE_URL}/voices/voice%2F01`
		);
	});
});

describe("createVoiceFromFile", () => {
	it("uploads the sample asset first, then clones from its asset_id", async () => {
		fetchMock
			.mockResolvedValueOnce(jsonResponse(successEnvelope(ASSET)))
			.mockResolvedValueOnce(jsonResponse(successEnvelope(CREATED)));

		await expect(
			createVoiceFromFile(FILE, {
				name: "Narrator",
				description: "Calm narration.",
			})
		).resolves.toEqual(CREATED);

		expect(fetchMock).toHaveBeenCalledTimes(2);

		const upload = firstCall();
		expect(upload.url).toBe(`${config.AUTH_BASE_URL}/assets`);
		expect(upload.init.method).toBe("POST");
		expect(upload.init.body).toBeInstanceOf(FormData);
		const formData = upload.init.body;
		if (!(formData instanceof FormData)) {
			throw new Error("expected a multipart upload body");
		}
		expect(formData.get("kind")).toBe("voice_sample");
		expect(formData.get("file")).toBe(FILE);

		const clone = callAt(1);
		expect(clone.url).toBe(`${config.AUTH_BASE_URL}/studio/voices`);
		expect(clone.init.method).toBe("POST");
		expect(clone.init.body).toBe(
			JSON.stringify({
				asset_id: ASSET.asset_id,
				name: "Narrator",
				description: "Calm narration.",
			})
		);
	});

	it("never clones when the sample upload fails", async () => {
		fetchMock.mockResolvedValueOnce(jsonResponse(failureEnvelope(), 400));

		await expect(
			createVoiceFromFile(FILE, { name: "Narrator" })
		).rejects.toBeInstanceOf(ApiError);

		expect(fetchMock).toHaveBeenCalledTimes(1);
	});
});

describe("voice failures", () => {
	it("throws the envelope message and diagnostics", async () => {
		fetchMock.mockResolvedValue(
			jsonResponse(
				{
					ok: false,
					code: 4001,
					message:
						"A dashboard session is required to use the voice library.",
					data: null,
					errors: { session: "Sign in and retry." },
					meta: {},
				},
				401
			)
		);

		const error = await listVoices().catch((cause: unknown) => cause);

		expect(error).toBeInstanceOf(ApiError);
		expect(error).toMatchObject({
			message:
				"A dashboard session is required to use the voice library.",
			status: 401,
			code: 4001,
			errors: { session: "Sign in and retry." },
		});
	});
});
