/* eslint-disable turbo/no-undeclared-env-vars */
import { envelope, json, startServer, type TestServer } from "./support/server";

/**
 * A minimal valid image-to-video request.
 */
const REQUEST = {
	model: "v6" as const,
	prompt: "The cup begins to steam",
	duration: 5,
	quality: "720p" as const,
	aspect_ratio: "16:9" as const,
	img_id: 123456,
};

describe("createImageToVideo", () => {
	let server: TestServer;
	let answer: (res: Parameters<typeof json>[0]) => void;
	let createImageToVideo: (typeof import("../src/video/image-to-video"))["createImageToVideo"];

	beforeAll(async () => {
		server = await startServer((_req, res) => {
			answer(res);
		});

		process.env.PIXVERSE_BASE_URL = server.baseURL;
		process.env.PIXVERSE_API_KEY = "test_key";

		({ createImageToVideo } = await import("../src/video/image-to-video"));
	});

	afterAll(async () => {
		await server.close();
	});

	beforeEach(() => {
		server.requests.length = 0;
	});

	it("posts an image task to the documented endpoint", async () => {
		answer = (res) => json(res, envelope({ video_id: 9, credits: 30 }));

		const result = await createImageToVideo(REQUEST);

		const request = server.requests[0]!;

		expect(request.method).toBe("POST");
		expect(request.url).toBe("/openapi/v2/video/img/generate");
		expect(JSON.parse(request.body)).toStrictEqual(REQUEST);
		expect(result).toStrictEqual({ video_id: 9, credits: 30 });
	});

	it("accepts a template task without an img_id", async () => {
		answer = (res) => json(res, envelope({ video_id: 9, credits: 30 }));

		await expect(
			createImageToVideo({
				model: "v6",
				prompt: "a template render",
				duration: 5,
				quality: "720p",
				aspect_ratio: "16:9",
				template_id: 519,
				img_ids: [1, 2],
			})
		).resolves.toMatchObject({ video_id: 9 });
	});

	it("refuses a task that is neither an image nor a template", async () => {
		answer = (res) => json(res, envelope({ video_id: 9, credits: 30 }));

		// only the image is dropped: the rest of the request is valid
		const withoutImage: Record<string, unknown> = { ...REQUEST };
		delete withoutImage.img_id;

		await expect(createImageToVideo(withoutImage as never)).rejects.toThrow(
			/img_id/
		);

		expect(server.requests).toHaveLength(0);
	});

	it("does not replay a creation request that failed with 5xx", async () => {
		answer = (res) => json(res, { message: "boom" }, 500);

		await expect(createImageToVideo(REQUEST)).rejects.toThrow();

		expect(server.requests).toHaveLength(1);
	});
});
