/* eslint-disable turbo/no-undeclared-env-vars */
import { envelope, json, startServer, type TestServer } from "./support/server";

describe("media and account", () => {
	let server: TestServer;
	let answer: (res: Parameters<typeof json>[0]) => void;
	let uploadImage: (typeof import("../src/media/upload-image"))["uploadImage"];
	let getAccountBalance: (typeof import("../src/account/get-balance"))["getAccountBalance"];

	beforeAll(async () => {
		server = await startServer((_req, res) => {
			answer(res);
		});

		process.env.PIXVERSE_BASE_URL = server.baseURL;
		process.env.PIXVERSE_API_KEY = "test_key";

		({ uploadImage } = await import("../src/media/upload-image"));
		({ getAccountBalance } = await import("../src/account/get-balance"));
	});

	afterAll(async () => {
		await server.close();
	});

	beforeEach(() => {
		server.requests.length = 0;
	});

	describe("uploadImage", () => {
		it("posts a multipart upload and returns the image id", async () => {
			answer = (res) =>
				json(
					res,
					envelope({
						img_id: 456,
						img_url: "https://media.example.com/i.jpg",
					})
				);

			const result = await uploadImage({
				file: {
					data: new Uint8Array([1, 2, 3]),
					filename: "photo.jpg",
					content_type: "image/jpeg",
				},
				label_name: "source",
			});

			const request = server.requests[0]!;

			expect(request.method).toBe("POST");
			expect(request.url).toBe("/openapi/v2/image/upload");
			expect(request.headers["content-type"]).toContain(
				"multipart/form-data"
			);
			expect(request.body).toContain('name="image"');
			expect(request.body).toContain('filename="photo.jpg"');
			expect(request.body).toContain('name="LabelName"');
			expect(request.body).toContain("source");
			expect(result).toStrictEqual({
				img_id: 456,
				img_url: "https://media.example.com/i.jpg",
			});
		});

		it("reports an image that cannot be uploaded", async () => {
			answer = (res) =>
				json(res, {
					ErrCode: 500030,
					ErrMsg: "Image size cannot exceed 20 MB",
					Resp: null,
				});

			await expect(
				uploadImage({
					file: { data: new Uint8Array([1]), filename: "big.jpg" },
				})
			).rejects.toMatchObject({ statusCode: 400 });
		});

		it("does not replay an upload that failed with 5xx", async () => {
			answer = (res) => json(res, { message: "boom" }, 500);

			await expect(
				uploadImage({
					file: { data: new Uint8Array([1]), filename: "a.jpg" },
				})
			).rejects.toThrow();

			expect(server.requests).toHaveLength(1);
		});
	});

	describe("getAccountBalance", () => {
		it("reads the documented balance endpoint", async () => {
			answer = (res) =>
				json(
					res,
					envelope({
						account_id: 12,
						credit_monthly: 100,
						credit_package: 50,
					})
				);

			const result = await getAccountBalance();

			const request = server.requests[0]!;

			expect(request.method).toBe("GET");
			expect(request.url).toBe("/openapi/v2/account/balance");
			expect(result).toStrictEqual({
				account_id: 12,
				credit_monthly: 100,
				credit_package: 50,
			});
		});

		it("reports an invalid api key", async () => {
			answer = (res) =>
				json(res, {
					ErrCode: 10001,
					ErrMsg: "Invalid token",
					Resp: null,
				});

			await expect(getAccountBalance()).rejects.toMatchObject({
				statusCode: 401,
			});
		});
	});
});
