import { config } from "@/config";
import type { Mock } from "vitest";
import {
	buildUploadFormData,
	deleteAsset,
	getAssetUrl,
	listAssets,
	uploadAsset,
} from "../api";
import { AssetApiError } from "../types";

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
		message: "The asset could not be uploaded.",
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

function firstCall(): { url: string; init: RequestInit } {
	const call = fetchMock.mock.calls.at(0);
	if (!call) {
		throw new Error("fetch was not called");
	}
	return { url: String(call[0]), init: call[1] ?? {} };
}

beforeEach(() => {
	fetchMock = vi.fn<FetchLike>();
	vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("buildUploadFormData", () => {
	it("sends exactly the kind and file parts", () => {
		const formData = buildUploadFormData({ kind: "audio", file: FILE });

		expect(formData.get("kind")).toBe("audio");
		expect(formData.get("file")).toBe(FILE);
		expect([...formData.keys()]).toEqual(["kind", "file"]);
	});
});

describe("uploadAsset", () => {
	it("posts the multipart body to the asset route with the session", async () => {
		fetchMock.mockResolvedValue(jsonResponse(successEnvelope(ASSET)));
		const formData = buildUploadFormData({ kind: "audio", file: FILE });

		await expect(uploadAsset(formData)).resolves.toEqual(ASSET);

		const { url, init } = firstCall();
		expect(url).toBe(`${config.AUTH_BASE_URL}/assets`);
		expect(init.method).toBe("POST");
		expect(init.credentials).toBe("include");
		expect(init.body).toBe(formData);
	});

	it("leaves the multipart boundary to the browser", async () => {
		fetchMock.mockResolvedValue(jsonResponse(successEnvelope(ASSET)));

		await uploadAsset(buildUploadFormData({ kind: "image", file: FILE }));

		const headers = new Headers(firstCall().init.headers);
		expect(headers.get("accept")).toBe("application/json");
		// A hand-written Content-Type would lose the boundary.
		expect(headers.get("content-type")).toBeNull();
	});

	it("throws the envelope message on a failure response", async () => {
		fetchMock.mockResolvedValue(jsonResponse(failureEnvelope(), 400));

		const error = await uploadAsset(
			buildUploadFormData({ kind: "audio", file: FILE })
		).catch((cause: unknown) => cause);

		expect(error).toBeInstanceOf(AssetApiError);
		expect(error).toMatchObject({
			message: "The asset could not be uploaded.",
			status: 400,
			code: 4001,
			errors: {
				upload: "Send a multipart form with `kind` and `file`.",
			},
		});
	});
});

describe("listAssets", () => {
	it("requests a page with the limit and offset query", async () => {
		fetchMock.mockResolvedValue(
			jsonResponse(
				successEnvelope({ items: [ASSET], limit: 24, offset: 48 })
			)
		);

		const page = await listAssets({ limit: 24, offset: 48 });

		expect(page.items).toEqual([ASSET]);
		const { url, init } = firstCall();
		expect(url).toBe(`${config.AUTH_BASE_URL}/assets?limit=24&offset=48`);
		expect(init.method).toBe("GET");
		expect(init.credentials).toBe("include");
	});

	it("omits the query when no pagination is requested", async () => {
		fetchMock.mockResolvedValue(
			jsonResponse(successEnvelope({ items: [], limit: 50, offset: 0 }))
		);

		await listAssets();

		expect(firstCall().url).toBe(`${config.AUTH_BASE_URL}/assets`);
	});

	it("forwards request headers for the server-side prefetch", async () => {
		fetchMock.mockResolvedValue(
			jsonResponse(successEnvelope({ items: [], limit: 24, offset: 0 }))
		);

		await listAssets(
			{ limit: 24, offset: 0 },
			{ headers: { cookie: "better-auth.session_token=abc" } }
		);

		const headers = new Headers(firstCall().init.headers);
		expect(headers.get("cookie")).toBe("better-auth.session_token=abc");
	});
});

describe("getAssetUrl", () => {
	it("requests the signed URL for one asset", async () => {
		fetchMock.mockResolvedValue(
			jsonResponse(
				successEnvelope({ url: "https://r2/x", expires_in: 900 })
			)
		);

		await expect(getAssetUrl("ast_01")).resolves.toEqual({
			url: "https://r2/x",
			expires_in: 900,
		});

		const { url, init } = firstCall();
		expect(url).toBe(`${config.AUTH_BASE_URL}/assets/ast_01/url`);
		expect(init.method).toBe("GET");
	});

	it("encodes the asset id", async () => {
		fetchMock.mockResolvedValue(
			jsonResponse(
				successEnvelope({ url: "https://r2/x", expires_in: 900 })
			)
		);

		await getAssetUrl("ast/01");

		expect(firstCall().url).toBe(
			`${config.AUTH_BASE_URL}/assets/ast%2F01/url`
		);
	});
});

describe("deleteAsset", () => {
	it("deletes one asset", async () => {
		fetchMock.mockResolvedValue(
			jsonResponse(successEnvelope({ deleted: true }))
		);

		await expect(deleteAsset("ast_01")).resolves.toEqual({
			deleted: true,
		});

		const { url, init } = firstCall();
		expect(url).toBe(`${config.AUTH_BASE_URL}/assets/ast_01`);
		expect(init.method).toBe("DELETE");
	});
});
