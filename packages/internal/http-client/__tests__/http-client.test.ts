import { USER_AGENT } from "@itsrose/system";
import axios from "axios";
import {
	createHttpClient,
	DEFAULT_RETRY_CONFIG,
	defaultRetryConfig,
	fetcher,
	HttpClient,
	HttpClientError,
	HttpPromise,
	isHttpClientError,
	resolveRetryConfig,
} from "../src";

describe("internal/http-client", () => {
	describe("exports & architecture", () => {
		it("exports core constructs and factories", () => {
			expect(createHttpClient).toBeDefined();
			expect(HttpClient).toBeDefined();
			expect(HttpPromise).toBeDefined();
			expect(HttpClientError).toBeDefined();
			expect(isHttpClientError).toBeDefined();
			expect(defaultRetryConfig).toBeDefined();
			expect(DEFAULT_RETRY_CONFIG).toBe(defaultRetryConfig);
			expect(resolveRetryConfig).toBeDefined();
			expect(fetcher).toBeDefined();
		});

		it("exports fetcher as a pre-configured callable client", () => {
			expect(typeof fetcher).toBe("function");
			expect(typeof fetcher.get).toBe("function");
			expect(typeof fetcher.post).toBe("function");
			expect(typeof fetcher.create).toBe("function");
			expect(typeof fetcher.extend).toBe("function");
		});
	});

	describe("client creation & configuration", () => {
		it("sets default User-Agent header from @itsrose/system", () => {
			const client = createHttpClient();
			const ua =
				(client.defaults.headers as any)["User-Agent"] ??
				client.defaults.headers.common["User-Agent"];
			expect(ua).toBe(USER_AGENT);
		});

		it("allows custom User-Agent override", () => {
			const client = createHttpClient({ userAgent: "CustomAgent/1.0" });
			const ua =
				(client.defaults.headers as any)["User-Agent"] ??
				client.defaults.headers.common["User-Agent"];
			expect(ua).toBe("CustomAgent/1.0");
		});

		it("configures retries with default or custom options", () => {
			const disabled1 = resolveRetryConfig({ retry: false });
			expect(disabled1).toBe(false);

			const disabled2 = resolveRetryConfig({ retryConfig: false });
			expect(disabled2).toBe(false);

			const custom = resolveRetryConfig({ retry: { retries: 5 } });
			expect(custom).not.toBe(false);
			if (custom !== false) {
				expect(custom.retries).toBe(5);
			}
		});
	});

	describe("callable execution & HTTP methods", () => {
		let requestSpy: jest.SpyInstance;

		beforeEach(() => {
			requestSpy = jest.spyOn(axios.Axios.prototype, "request");
		});

		afterEach(() => {
			requestSpy.mockRestore();
		});

		it("supports calling client directly with URL string", async () => {
			requestSpy.mockResolvedValueOnce({
				status: 200,
				statusText: "OK",
				data: { message: "pong" },
				headers: {},
			});

			const client = createHttpClient();
			const res = await client<{ message: string }>("/ping");

			expect(res.ok).toBe(true);
			expect(res.data).toEqual({ message: "pong" });
			expect(requestSpy).toHaveBeenCalledWith(
				expect.objectContaining({ url: "/ping" })
			);
		});

		it("supports calling client directly with config object", async () => {
			requestSpy.mockResolvedValueOnce({
				status: 200,
				statusText: "OK",
				data: { status: "ready" },
				headers: {},
			});

			const client = createHttpClient();
			const res = await client<{ status: string }>({
				url: "/health",
				method: "GET",
			});

			expect(res.ok).toBe(true);
			expect(res.data).toEqual({ status: "ready" });
			expect(requestSpy).toHaveBeenCalledWith(
				expect.objectContaining({ url: "/health", method: "GET" })
			);
		});

		it("supports get, post, put, patch, delete, head, options", async () => {
			const client = createHttpClient();

			requestSpy.mockResolvedValue({
				status: 200,
				statusText: "OK",
				data: {},
				headers: {},
			});

			await client.get("/test");
			expect(requestSpy).toHaveBeenLastCalledWith(
				expect.objectContaining({ method: "get", url: "/test" })
			);

			await client.post("/test", { hello: "world" });
			expect(requestSpy).toHaveBeenLastCalledWith(
				expect.objectContaining({
					method: "post",
					url: "/test",
					data: { hello: "world" },
				})
			);

			await client.put("/test", { hello: "updated" });
			expect(requestSpy).toHaveBeenLastCalledWith(
				expect.objectContaining({
					method: "put",
					url: "/test",
					data: { hello: "updated" },
				})
			);

			await client.patch("/test", { partial: true });
			expect(requestSpy).toHaveBeenLastCalledWith(
				expect.objectContaining({
					method: "patch",
					url: "/test",
					data: { partial: true },
				})
			);

			await client.delete("/test");
			expect(requestSpy).toHaveBeenLastCalledWith(
				expect.objectContaining({ method: "delete", url: "/test" })
			);

			await client.head("/test");
			expect(requestSpy).toHaveBeenLastCalledWith(
				expect.objectContaining({ method: "head", url: "/test" })
			);

			await client.options("/test");
			expect(requestSpy).toHaveBeenLastCalledWith(
				expect.objectContaining({ method: "options", url: "/test" })
			);
		});
	});

	describe("HttpRequestPromise & unwrapping", () => {
		let requestSpy: jest.SpyInstance;

		beforeEach(() => {
			requestSpy = jest.spyOn(axios.Axios.prototype, "request");
		});

		afterEach(() => {
			requestSpy.mockRestore();
		});

		it("memoizes execution on multiple awaits", async () => {
			requestSpy.mockResolvedValueOnce({
				status: 200,
				statusText: "OK",
				data: { id: 1 },
				headers: {},
			});

			const client = createHttpClient();
			const reqPromise = client.get<{ id: number }>("/items/1");

			const [res1, res2] = await Promise.all([reqPromise, reqPromise]);

			expect(res1).toBe(res2);
			expect(requestSpy).toHaveBeenCalledTimes(1);
		});

		it("resolves response data and config", async () => {
			requestSpy.mockResolvedValueOnce({
				status: 200,
				statusText: "OK",
				data: { result: 42 },
				headers: {},
				config: { url: "/calc" },
			});

			const client = createHttpClient();
			const res = await client.get<{ result: number }>("/calc");
			expect(res.ok).toBe(true);
			expect(res.data).toEqual({ result: 42 });
			expect(res.config).toBeDefined();
		});

		it("returns typed error when request fails", async () => {
			requestSpy.mockRejectedValueOnce({
				isAxiosError: true,
				response: {
					status: 404,
					statusText: "Not Found",
					data: { error: "Item not found" },
					headers: {},
					config: { url: "/missing" },
				},
			});

			const client = createHttpClient();
			const res = await client.get("/missing");
			expect(res.ok).toBe(false);
			expect(res.status).toBe(404);
			expect(res.error).toBeDefined();
		});

		it("supports .onError() chaining on HttpRequestPromise", async () => {
			requestSpy.mockRejectedValueOnce({
				isAxiosError: true,
				response: {
					status: 400,
					statusText: "Bad Request",
					data: { code: "INVALID_PARAM" },
					headers: {},
				},
			});

			const client = createHttpClient();
			const res = await client
				.get("/bad")
				.onError((data) => `Custom error: ${data?.code}`);

			expect(res.ok).toBe(false);
			expect(res.error).toBe("Custom error: INVALID_PARAM");
		});

		it("returns undefined data without throwing when throwOnError is false on get()", async () => {
			requestSpy.mockRejectedValueOnce({
				name: "AxiosError",
				message: "Network Error",
				isAxiosError: true,
				config: { url: "/network-error-2", throwOnError: false },
			});

			const client = createHttpClient();
			const res = await client.get<{ count: number }>(
				"/network-error-2",
				{ throwOnError: false }
			);

			expect(res.ok).toBe(false);
			expect(res.data).toBeUndefined();
			expect(res.status).toBeUndefined();
			expect(res.error).toBeDefined();
			expect(isHttpClientError(res.error)).toBe(true);

			// Type checking: res.data includes undefined
			const data: { count: number } | undefined = res.data;
			expect(data).toBeUndefined();
			// @ts-expect-error - res.data is possibly undefined
			const strictData: { count: number } = res.data;
			void strictData;
		});

		it("throws when throwOnError is explicitly true on get()", async () => {
			requestSpy.mockRejectedValueOnce({
				name: "AxiosError",
				message: "Network Error",
				isAxiosError: true,
				config: { url: "/network-error-throw", throwOnError: true },
			});

			const client = createHttpClient();
			await expect(
				client.get<{ count: number }>("/network-error-throw", {
					throwOnError: true,
				})
			).rejects.toThrow("Network Error");
		});

		it("returns undefined data without throwing when throwOnError is false on post()", async () => {
			requestSpy.mockRejectedValueOnce({
				name: "AxiosError",
				message: "Network Error",
				isAxiosError: true,
				config: { url: "/post-error", throwOnError: false },
			});

			const client = createHttpClient();
			const res = await client.post<{ created: boolean }>(
				"/post-error",
				{ title: "test" },
				{ throwOnError: false }
			);

			expect(res.ok).toBe(false);
			expect(res.data).toBeUndefined();
			expect(res.error).toBeDefined();

			const data: { created: boolean } | undefined = res.data;
			expect(data).toBeUndefined();
			// @ts-expect-error - res.data is possibly undefined
			const strictData: { created: boolean } = res.data;
			void strictData;
		});

		it("returns undefined data when client-level throwOnError is false", async () => {
			requestSpy.mockRejectedValueOnce({
				name: "AxiosError",
				message: "Network Error",
				isAxiosError: true,
				config: { url: "/client-safe-error" },
			});

			const safeClient = createHttpClient({ throwOnError: false });
			const res = await safeClient.get<{ count: number }>(
				"/client-safe-error"
			);

			expect(res.ok).toBe(false);
			expect(res.data).toBeUndefined();
			expect(res.error).toBeDefined();

			const data: { count: number } | undefined = res.data;
			expect(data).toBeUndefined();
			// @ts-expect-error Type 'undefined' is not assignable to type '{ count: number; }'
			const strictData: { count: number } = res.data;
			void strictData;
		});

		it("allows overriding client-level throwOnError: false with request-level throwOnError: true", async () => {
			requestSpy.mockRejectedValueOnce({
				name: "AxiosError",
				message: "Network Error",
				isAxiosError: true,
				config: { url: "/client-safe-override", throwOnError: true },
			});

			const safeClient = createHttpClient({ throwOnError: false });
			await expect(
				safeClient.get<{ count: number }>("/client-safe-override", {
					throwOnError: true,
				})
			).rejects.toThrow("Network Error");
		});

		it("supports callable client syntax with throwOnError: false", async () => {
			requestSpy.mockRejectedValueOnce({
				name: "AxiosError",
				message: "Network Error",
				isAxiosError: true,
				config: { url: "/callable-error", throwOnError: false },
			});

			const client = createHttpClient();
			const res = await client<{ result: string }>("/callable-error", {
				throwOnError: false,
			});

			expect(res.ok).toBe(false);
			expect(res.data).toBeUndefined();

			const data: { result: string } | undefined = res.data;
			expect(data).toBeUndefined();
			// @ts-expect-error - res.data is possibly undefined
			const strictData: { result: string } = res.data;
			void strictData;
		});
	});

	describe("inheritance: create() and extend()", () => {
		it("create() returns a callable client with isolated config", () => {
			const client = createHttpClient({ baseURL: "https://v1.api.com" });
			const child = client.create({ baseURL: "https://v2.api.com" });

			expect(typeof child).toBe("function");
			expect(child.defaults.baseURL).toBe("https://v2.api.com");
			expect(client.defaults.baseURL).toBe("https://v1.api.com");
		});

		it("extend() merges headers and inherits callable factory behavior", () => {
			const client = createHttpClient({
				headers: { "X-Common": "base" },
			});
			const extended = client.extend({
				headers: { "X-Child": "custom" },
			});

			expect(typeof extended).toBe("function");
			expect(typeof extended.get).toBe("function");
		});
	});

	describe("HttpClientError", () => {
		it("constructs informative error with status, url, method, and cause", () => {
			const axiosErr = {
				name: "AxiosError",
				message: "Request failed with status code 500",
				isAxiosError: true,
				config: { method: "post", url: "https://api.com/checkout" },
				response: {
					status: 500,
					statusText: "Internal Server Error",
					data: { details: "crash" },
				},
			} as any;

			const err = new HttpClientError(axiosErr);
			expect(err.name).toBe("HttpClientError");
			expect(err.isHttpClientError).toBe(true);
			expect(err.status).toBe(500);
			expect(err.statusText).toBe("Internal Server Error");
			expect(err.url).toBe("https://api.com/checkout");
			expect(err.method).toBe("post");
			expect(err.message).toContain(
				"Request failed with status code 500"
			);
			expect(isHttpClientError(err)).toBe(true);
		});

		it("normalizes unknown errors via HttpClientError.from()", () => {
			const err = HttpClientError.from(new Error("network failure"));
			expect(err instanceof HttpClientError).toBe(true);
			expect(err.message).toBe("network failure");

			const same = HttpClientError.from(err);
			expect(same).toBe(err);
		});

		it("isHttpClientError correctly identifies errors", () => {
			expect(isHttpClientError(null)).toBe(false);
			expect(isHttpClientError("error")).toBe(false);
			expect(isHttpClientError(new Error("generic"))).toBe(false);
			expect(isHttpClientError({ isHttpClientError: true })).toBe(true);
		});
	});
});
