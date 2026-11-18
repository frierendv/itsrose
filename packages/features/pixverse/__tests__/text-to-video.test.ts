/* eslint-disable turbo/no-undeclared-env-vars */
import { UpstreamApiError } from "@itsrose/upstream-client";
import { envelope, json, startServer, type TestServer } from "./support/server";

/**
 * A minimal valid text-to-video request.
 */
const REQUEST = {
	model: "v6-max" as const,
	prompt: "A blue glass marble rolls across a clean white table",
	duration: 1,
	quality: "360p" as const,
	aspect_ratio: "1:1" as const,
};

describe("createTextToVideo", () => {
	let server: TestServer;
	let answer: (res: Parameters<typeof json>[0]) => void;
	let createTextToVideo: (typeof import("../src/video/text-to-video"))["createTextToVideo"];

	beforeAll(async () => {
		server = await startServer((_req, res) => {
			answer(res);
		});

		process.env.PIXVERSE_BASE_URL = server.baseURL;
		process.env.PIXVERSE_API_KEY = "test_key";

		({ createTextToVideo } = await import("../src/video/text-to-video"));
	});

	afterAll(async () => {
		await server.close();
	});

	beforeEach(() => {
		server.requests.length = 0;
	});

	it("posts the request to the documented endpoint", async () => {
		answer = (res) => json(res, envelope({ video_id: 123, credits: 10 }));

		const result = await createTextToVideo(REQUEST);

		expect(server.requests).toHaveLength(1);
		const request = server.requests[0]!;

		expect(request.method).toBe("POST");
		expect(request.url).toBe("/openapi/v2/video/text/generate");
		expect(JSON.parse(request.body)).toStrictEqual(REQUEST);
		// the upstream answers `video_id`; the package publishes `task_id`
		// and the shared status vocabulary
		expect(result).toStrictEqual({
			status: "in_progress",
			task_id: "123",
			credits: 10,
		});
	});

	it("sends the api key and a trace id", async () => {
		answer = (res) => json(res, envelope({ video_id: 1, credits: 1 }));

		await createTextToVideo(REQUEST);

		const request = server.requests[0]!;

		expect(request.headers["api-key"]).toBe("test_key");
		expect(request.headers["ai-trace-id"]).toMatch(
			/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
		);
	});

	it("sends a different trace id on every request", async () => {
		answer = (res) => json(res, envelope({ video_id: 1, credits: 1 }));

		await createTextToVideo(REQUEST);
		await createTextToVideo(REQUEST);

		const first = server.requests[0]!;
		const second = server.requests[1]!;

		expect(first.headers["ai-trace-id"]).not.toBe(
			second.headers["ai-trace-id"]
		);
	});

	it("raises the documented status for a business failure on HTTP 200", async () => {
		answer = (res) =>
			json(
				res,
				{
					ErrCode: 500090,
					ErrMsg: "Insufficient balance",
					Resp: null,
				},
				200
			);

		const failure = createTextToVideo(REQUEST);

		await expect(failure).rejects.toThrow(UpstreamApiError);
		await expect(failure).rejects.toMatchObject({
			statusCode: 402,
			service: "pixverse",
			// the exact message comes from ErrMsg, not from the code the test
			// was written for, to prove the envelope is read as it was sent
			message: "Insufficient balance",
		});
	});

	it("prefers the documented detail message over the summary", async () => {
		answer = (res) =>
			json(res, {
				ErrCode: 400017,
				ErrMsg: "Invalid parameter",
				Resp: null,
				Error: {
					Type: "FIELD_REQUIRED",
					Message: "Field 'quality' has an unsupported value.",
					Param: { Fields: ["quality"] },
				},
			});

		await expect(createTextToVideo(REQUEST)).rejects.toMatchObject({
			statusCode: 400,
			message: "Field 'quality' has an unsupported value.",
		});
	});

	it("maps the concurrency limit onto 429 without retrying", async () => {
		answer = (res) =>
			json(res, {
				ErrCode: 500044,
				ErrMsg: "Too many tasks",
				Resp: null,
			});

		await expect(createTextToVideo(REQUEST)).rejects.toMatchObject({
			statusCode: 429,
		});
		expect(server.requests).toHaveLength(1);
	});

	it("does not replay a creation request that failed with 5xx", async () => {
		answer = (res) => json(res, { message: "boom" }, 500);

		await expect(createTextToVideo(REQUEST)).rejects.toThrow();

		expect(server.requests).toHaveLength(1);
	});

	it("rejects a request that violates the published contract", async () => {
		answer = (res) => json(res, envelope({ video_id: 1, credits: 1 }));

		await expect(
			createTextToVideo({ ...REQUEST, quality: "4k" as never })
		).rejects.toThrow();
		await expect(
			createTextToVideo({ ...REQUEST, duration: 99 })
		).rejects.toThrow();
		await expect(
			createTextToVideo({ ...REQUEST, prompt: "" })
		).rejects.toThrow();

		expect(server.requests).toHaveLength(0);
	});

	it("reports an upstream payload that does not match the schema", async () => {
		answer = (res) => json(res, envelope({ video_id: "not-an-int" }));

		await expect(createTextToVideo(REQUEST)).rejects.toMatchObject({
			statusCode: 500,
			isSchemaMismatch: true,
		});
	});
});
