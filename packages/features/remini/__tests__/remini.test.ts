import { extractImageMetadata } from "../src/utils/extract-image-metadata";
import { ReminiRequestSchema } from "../src/zod-schema/request";

// eslint-disable-next-line turbo/no-undeclared-env-vars
process.env.REMINI_API_BASE_URL = "https://remini.example.com";
// eslint-disable-next-line turbo/no-undeclared-env-vars
process.env.REMINI_WSS_BASE_URL = "wss://remini.example.com";

jest.mock("image-size", () => ({
	imageSize: (buf: Buffer) => {
		if (buf.toString().includes("no-type")) {
			return { width: 10, height: 10, type: undefined };
		}
		return jest.requireActual("image-size").imageSize(buf);
	},
}));

describe("features/remini", () => {
	describe("extractImageMetadata", () => {
		it("extracts dimensions, md5, and type from valid PNG buffer", () => {
			// 1x1 PNG base64
			const base64Png =
				"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
			const buffer = Buffer.from(base64Png, "base64");
			const [isOk, metadata] = extractImageMetadata(buffer);

			expect(isOk).toBe(true);
			expect(metadata!.image_content_type).toBe("image/png");
			expect(metadata!.image_resolution_width).toBe(1);
			expect(metadata!.image_resolution_height).toBe(1);
			expect(metadata!.image_size).toBe(buffer.length);
			expect(metadata!.image_md5).toBeDefined();
		});

		it("falls back to jpg image content type when type is not determined by imageSize", () => {
			const mockBuffer = Buffer.from("no-type-buffer");
			const [isOk, metadata] = extractImageMetadata(mockBuffer);

			expect(isOk).toBe(true);
			expect(metadata!.image_content_type).toBe("image/jpg");
			expect(metadata!.image_resolution_width).toBe(10);
			expect(metadata!.image_resolution_height).toBe(10);
		});
	});

	describe("ReminiRequestSchema", () => {
		it("validates remini request payload", () => {
			const payload = {
				init_image: "https://example.com/photo.jpg",
				pipelines: [
					{ face_enhance: { model: "remini", pre_blur: 0.5 } },
				],
			};
			const result = ReminiRequestSchema.safeParse(payload);
			expect(result.success).toBe(true);
		});
	});

	describe("Package Index Exports & createTask", () => {
		it("imports package exports without throwing", async () => {
			const rootIndex = await import("../src/index");
			const clientIndex = await import("../src/client/index");
			const reminiIndex = await import("../src/remini/index");
			const zodIndex = await import("../src/zod-schema/index");
			const zodResponse = await import("../src/zod-schema/response");

			expect(rootIndex.createTask).toBeDefined();
			expect(clientIndex.Client).toBeDefined();
			expect(reminiIndex.createTask).toBeDefined();
			expect(zodIndex.ReminiRequestSchema).toBeDefined();
			expect(zodResponse.ReminiResponseSchema).toBeDefined();
		});

		it("creates task with base64 image successfully", async () => {
			const { createTask } = await import("../src/remini/create-task");
			const base64Png =
				"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

			const mockClient = {
				task: {
					create: jest.fn().mockResolvedValue({
						status: "completed",
						result: {
							outputs: [{ url: "https://example.com/out.jpg" }],
						},
						error: null,
					}),
				},
			} as any;

			const res = await createTask(
				{
					init_image: { type: "jpg", value: base64Png },
					pipelines: [
						{ face_enhance: { model: "remini", pre_blur: 0.6 } },
					],
				},
				mockClient
			);

			expect(res.media_list).toEqual(["https://example.com/out.jpg"]);
		});

		it("creates task with URL image successfully", async () => {
			const { createTask } = await import("../src/remini/create-task");
			const { fetcher } = await import("@itsrose/http-client");

			const base64Png =
				"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
			const buffer = Buffer.from(base64Png, "base64");

			jest.spyOn(fetcher, "get").mockResolvedValue({
				data: buffer,
			} as any);

			const mockClient = {
				task: {
					create: jest.fn().mockResolvedValue({
						status: "completed",
						result: {
							outputs: [
								{ url: "https://example.com/url_out.jpg" },
							],
						},
						error: null,
					}),
				},
			} as any;

			const res = await createTask(
				{
					init_image: {
						type: "url",
						value: "https://example.com/in.jpg",
					},
					pipelines: [
						{ face_enhance: { model: "remini", pre_blur: 0.6 } },
					],
				},
				mockClient
			);

			expect(res.media_list).toEqual(["https://example.com/url_out.jpg"]);
		});

		it("throws ThirdPartyApiError when task processing status is failed", async () => {
			const { createTask } = await import("../src/remini/create-task");

			const mockClient = {
				task: {
					create: jest.fn().mockResolvedValue({
						status: "failed",
						result: null,
						error: {
							error_reason: "FAILED",
							error_description: "Inference failed",
						},
					}),
				},
			} as any;

			await expect(
				createTask(
					{
						init_image: { type: "jpg", value: "aaaa" },
						pipelines: [
							{
								face_enhance: {
									model: "remini",
									pre_blur: 0.6,
								},
							},
						],
					},
					mockClient
				)
			).rejects.toThrow("Inference failed");
		});

		it("throws ThirdPartyApiError fallback message when error_description is missing", async () => {
			const { createTask } = await import("../src/remini/create-task");

			const mockClient = {
				task: {
					create: jest.fn().mockResolvedValue({
						status: "failed",
						result: null,
						error: null,
					}),
				},
			} as any;

			await expect(
				createTask(
					{
						init_image: { type: "jpg", value: "aaaa" },
						pipelines: [
							{
								face_enhance: {
									model: "remini",
									pre_blur: 0.6,
								},
							},
						],
					},
					mockClient
				)
			).rejects.toThrow("Remini inference failed.");
		});

		it("creates task using default client when customClient is omitted", async () => {
			const { createTask } = await import("../src/remini/create-task");

			const { Task } = await import("../src/client/task");

			jest.spyOn(Task.prototype, "create").mockResolvedValue({
				status: "completed",
				result: {
					input_url: "in",
					expire_at: "2030",
					outputs: [{ url: "https://example.com/default_out.jpg" }],
				},
				error: null,
			});

			const base64Png =
				"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

			const res = await createTask({
				init_image: { type: "jpg", value: base64Png },
				pipelines: [
					{ face_enhance: { model: "remini", pre_blur: 0.6 } },
				],
			});

			expect(res.media_list).toEqual([
				"https://example.com/default_out.jpg",
			]);
		});
	});
});
