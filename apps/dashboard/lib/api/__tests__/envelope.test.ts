import { config } from "@/config";
import type { Mock } from "vitest";
import { z } from "zod/v4";
import {
	apiEndpoint,
	ApiError,
	jsonRequestInit,
	parseData,
	parseEnvelope,
	requestApi,
	type ApiErrorDetails,
} from "../envelope";

type FetchLike = (
	input: RequestInfo | URL,
	init?: RequestInit
) => Promise<Response>;

const PAYLOAD = { generation_id: "gen_01" };

const payloadSchema = z.object({ generation_id: z.string() });

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
		message: "The generation could not be read.",
		data: null,
		errors: { generation_id: "gen_01" },
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

describe("apiEndpoint", () => {
	it("prefixes a root-relative path with the API origin", () => {
		expect(apiEndpoint("/studio/speech")).toBe(
			`${config.AUTH_BASE_URL}/studio/speech`
		);
	});
});

describe("parseEnvelope", () => {
	it("parses a success envelope into typed data", () => {
		const envelope = parseEnvelope(payloadSchema, successEnvelope(PAYLOAD));

		expect(envelope.ok).toBe(true);
		if (!envelope.ok) {
			throw new Error("expected a success envelope");
		}
		expect(envelope.data).toEqual(PAYLOAD);
		expect(envelope.code).toBe(1000);
	});

	it("keeps a failure envelope as data rather than an exception", () => {
		const envelope = parseEnvelope(payloadSchema, failureEnvelope(), {
			status: 404,
		});

		expect(envelope.ok).toBe(false);
		if (envelope.ok) {
			throw new Error("expected a failure envelope");
		}
		expect(envelope.code).toBe(4001);
		expect(envelope.errors).toEqual({ generation_id: "gen_01" });
	});

	it("parses a failure envelope whose errors field is null", () => {
		const envelope = parseEnvelope(payloadSchema, {
			...failureEnvelope(),
			errors: null,
		});

		expect(envelope.ok).toBe(false);
	});

	it("rejects a body that is not an envelope", () => {
		expect(() =>
			parseEnvelope(payloadSchema, "<html>502 Bad Gateway</html>", {
				status: 502,
			})
		).toThrow(ApiError);
		expect(() =>
			parseEnvelope(payloadSchema, null, { status: 502 })
		).toThrow(/unexpected response/);
	});

	it("rejects a success envelope whose payload breaks the schema", () => {
		expect(() =>
			parseEnvelope(payloadSchema, successEnvelope({ generation_id: 42 }))
		).toThrow(ApiError);
	});

	it("throws the requested error class and carries the status", () => {
		class SurfaceApiError extends ApiError {
			constructor(message: string, details: ApiErrorDetails = {}) {
				super(message, details);
				this.name = "SurfaceApiError";
			}
		}

		const error = (() => {
			try {
				parseEnvelope(payloadSchema, null, {
					status: 502,
					surface: "studio API",
					errorType: SurfaceApiError,
				});
				return null;
			} catch (cause) {
				return cause;
			}
		})();

		expect(error).toBeInstanceOf(SurfaceApiError);
		expect(error).toMatchObject({
			name: "SurfaceApiError",
			status: 502,
		});
		expect((error as Error).message).toBe(
			"The studio API returned an unexpected response (HTTP 502)."
		);
	});
});

describe("parseData", () => {
	it("validates the payload against the data schema", () => {
		expect(parseData(payloadSchema, PAYLOAD)).toEqual(PAYLOAD);
	});

	it("rejects a payload that does not match the schema", () => {
		expect(() => parseData(payloadSchema, { generation_id: 42 })).toThrow(
			/The API returned a payload that does not match its schema\./
		);
	});
});

describe("jsonRequestInit", () => {
	it("serialises the body and sets the JSON content type", () => {
		const init = jsonRequestInit("POST", PAYLOAD);

		expect(init.method).toBe("POST");
		expect(init.body).toBe(JSON.stringify(PAYLOAD));
		expect(new Headers(init.headers).get("content-type")).toBe(
			"application/json"
		);
	});
});

describe("requestApi", () => {
	it("sends the session with the request and parses the envelope", async () => {
		fetchMock.mockResolvedValue(jsonResponse(successEnvelope(PAYLOAD)));

		await expect(
			requestApi(
				payloadSchema,
				`${config.AUTH_BASE_URL}/studio/speech`,
				jsonRequestInit("POST", { text: "hi" })
			)
		).resolves.toEqual(PAYLOAD);

		const { url, init } = firstCall();
		expect(url).toBe(`${config.AUTH_BASE_URL}/studio/speech`);
		expect(init.method).toBe("POST");
		expect(init.credentials).toBe("include");
		expect(init.body).toBe(JSON.stringify({ text: "hi" }));

		const headers = new Headers(init.headers);
		expect(headers.get("accept")).toBe("application/json");
		expect(headers.get("content-type")).toBe("application/json");
	});

	it("forwards request headers without dropping the body content type", async () => {
		fetchMock.mockResolvedValue(jsonResponse(successEnvelope(PAYLOAD)));

		await requestApi(
			payloadSchema,
			`${config.AUTH_BASE_URL}/studio/speech`,
			jsonRequestInit("POST", {}),
			{ headers: { cookie: "better-auth.session_token=abc" } }
		);

		const headers = new Headers(firstCall().init.headers);
		expect(headers.get("cookie")).toBe("better-auth.session_token=abc");
		expect(headers.get("content-type")).toBe("application/json");
	});

	it("throws the failure envelope's message and diagnostics", async () => {
		fetchMock.mockResolvedValue(jsonResponse(failureEnvelope(), 404));

		const error = await requestApi(
			payloadSchema,
			`${config.AUTH_BASE_URL}/studio/generations/gen_01`,
			{ method: "GET" }
		).catch((cause: unknown) => cause);

		expect(error).toBeInstanceOf(ApiError);
		expect(error).toMatchObject({
			message: "The generation could not be read.",
			status: 404,
			code: 4001,
			errors: { generation_id: "gen_01" },
		});
	});

	it("throws when the body is not an envelope", async () => {
		fetchMock.mockResolvedValue(
			new Response("<html>502</html>", { status: 502 })
		);

		await expect(
			requestApi(payloadSchema, `${config.AUTH_BASE_URL}/studio`, {
				method: "GET",
			})
		).rejects.toThrow(/unexpected response/);
	});
});
