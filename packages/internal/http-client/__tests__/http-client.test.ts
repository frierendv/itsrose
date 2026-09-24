import { USER_AGENT } from "@itsrose/system";
import {
	AxiosError,
	createHttpClient,
	DEFAULT_RETRY_CONFIG,
	exponentialDelay,
	fetcher,
	HttpStatusCode,
	isAxiosError,
	isCancel,
	isNetworkError,
	RequestBuilder,
} from "../src";

describe("internal/http-client", () => {
	describe("package exports & primitives", () => {
		it("exports fetcher as a default http client instance", () => {
			expect(fetcher).toBeDefined();
			expect(typeof fetcher).toBe("function");
			expect(typeof fetcher.get).toBe("function");
			expect(typeof fetcher.post).toBe("function");
			expect(typeof fetcher.request).toBe("function");
		});

		it("exports RequestBuilder class and retry utilities", () => {
			expect(RequestBuilder).toBeDefined();
			expect(DEFAULT_RETRY_CONFIG).toBeDefined();
			expect(DEFAULT_RETRY_CONFIG.retries).toBe(3);
			expect(typeof exponentialDelay).toBe("function");
			expect(typeof isNetworkError).toBe("function");
		});

		it("re-exports Axios error and status code utilities", () => {
			expect(AxiosError).toBeDefined();
			expect(typeof isAxiosError).toBe("function");
			expect(typeof isCancel).toBe("function");
			expect(HttpStatusCode.Ok).toBe(200);
			expect(HttpStatusCode.NotFound).toBe(404);
		});
	});

	describe("client creation & configuration", () => {
		it("creates a client instance with custom configuration", () => {
			const client = createHttpClient({
				baseURL: "https://api.example.com",
				timeout: 5000,
			});
			expect(client).toBeDefined();
			expect(typeof client).toBe("function");
			expect(typeof client.get).toBe("function");
		});

		it("sets default User-Agent from system and allows custom override", () => {
			const defaultClient = createHttpClient();
			const defaultUa =
				(defaultClient.defaults.headers as any)["User-Agent"] ??
				defaultClient.defaults.headers.common["User-Agent"];
			expect(defaultUa).toBe(USER_AGENT);

			const customClient = createHttpClient({
				userAgent: "CustomApp/1.0.0",
			});
			const customUa =
				(customClient.defaults.headers as any)["User-Agent"] ??
				customClient.defaults.headers.common["User-Agent"];
			expect(customUa).toBe("CustomApp/1.0.0");
		});

		it("has axios like features and direct raw accessors", () => {
			const client = createHttpClient({
				baseURL: "https://api.example.com",
			});
			const features = ["interceptors", "defaults", "getUri"];

			for (const feature of features) {
				expect((client as any)[feature]).toBeDefined();
			}

			expect(client.raw).toBeDefined();
			expect(client.instance).toBe(client.raw);
			expect(client.axiosInstance).toBe(client.raw);
			expect(typeof client.getUri).toBe("function");
			expect(typeof client.get).toBe("function");
			expect(typeof client.post).toBe("function");
		});
	});

	describe("callable execution & HTTP methods", () => {
		it("supports callable execution with config or (url, config)", async () => {
			const client = createHttpClient({
				baseURL: "https://api.example.com",
			});
			(client as any).defaults.adapter = async (config: any) => ({
				data: { url: config.url, method: config.method },
				status: 200,
				statusText: "OK",
				headers: {},
				config,
			});

			// Direct callable with config object
			const res1 = await client({ url: "/direct-config", method: "get" });
			expect(res1.data).toEqual({
				url: "/direct-config",
				method: "get",
			});

			// Direct callable with (url, config)
			const res2 = await client("/direct-url", { method: "post" });
			expect(res2.data).toEqual({ url: "/direct-url", method: "post" });
		});

		it("supports client.request with config or (url, config)", async () => {
			const client = createHttpClient({
				baseURL: "https://api.example.com",
			});
			(client as any).defaults.adapter = async (config: any) => ({
				data: { url: config.url },
				status: 200,
				statusText: "OK",
				headers: {},
				config,
			});

			const res1 = await client.request({ url: "/req-config" });
			expect(res1.data).toEqual({ url: "/req-config" });

			const res2 = await client.request("/req-url", { method: "get" });
			expect(res2.data).toEqual({ url: "/req-url" });
		});

		it("supports all wrapped HTTP methods with payload and headers", async () => {
			const client = createHttpClient({
				baseURL: "https://api.example.com",
			});
			let lastConfig: any;
			(client as any).defaults.adapter = async (config: any) => {
				lastConfig = config;
				return {
					data: { received: config.data },
					status: 200,
					statusText: "OK",
					headers: {},
					config,
				};
			};

			// get, delete, head, options
			const methodWithoutBody = [
				"get",
				"delete",
				"head",
				"options",
			] as const;
			for (const method of methodWithoutBody) {
				const res = await (client as any)[method]("/test");
				expect(res).toBeDefined();
				expect(lastConfig.method.toLowerCase()).toBe(method);
			}

			// post, put, patch with body data
			const methodWithBody = ["post", "put", "patch"] as const;
			for (const method of methodWithBody) {
				const res = await (client as any)[method]("/test", {
					item: method,
				});
				expect(res).toBeDefined();
				expect(lastConfig.method.toLowerCase()).toBe(method);
				expect(JSON.parse(lastConfig.data)).toEqual({ item: method });
			}
		});
	});

	describe("RequestBuilder & Promise integration", () => {
		it("creates request builder with chainable onError handler", async () => {
			const client = createHttpClient({
				baseURL: "https://httpbin.org",
			});
			const builder = client.get("/get").onError((err) => ({
				message: err.message,
				statusCode: 500,
			}));

			expect(typeof builder.then).toBe("function");
			expect(typeof builder.catch).toBe("function");
			expect(typeof builder.finally).toBe("function");
			expect(typeof builder.onError).toBe("function");
			expect(typeof builder.unwrap).toBe("function");
			expect(typeof builder.toPromise).toBe("function");
			expect(builder[Symbol.toStringTag]).toBe("RequestBuilder");
		});

		it("memoizes execution so multiple awaits or then calls do not duplicate request", async () => {
			const client = createHttpClient();
			let requestCount = 0;
			(client as any).defaults.adapter = async () => {
				requestCount++;
				return {
					data: { count: requestCount },
					status: 200,
					statusText: "OK",
					headers: {},
				};
			};

			const builder = client.get("/memoized");
			const [first, second] = await Promise.all([builder, builder]);

			expect(first.data).toEqual({ count: 1 });
			expect(second.data).toEqual({ count: 1 });
			expect(requestCount).toBe(1);
		});

		it("supports .catch() and .finally() on RequestBuilder", async () => {
			const client = createHttpClient();
			(client as any).defaults.adapter = async () => {
				throw new Error("Simulated Failure");
			};

			let finallyCalled = false;
			const res = await client
				.get("/catch-test")
				.catch((err) => ({ caught: true, error: err }))
				.finally(() => {
					finallyCalled = true;
				});

			expect(res).toBeDefined();
			expect(finallyCalled).toBe(true);
		});

		it("unwraps data directly with .unwrap() on success", async () => {
			const client = createHttpClient();
			(client as any).defaults.adapter = async () => ({
				data: { message: "unwrapped data" },
				status: 200,
				statusText: "OK",
				headers: {},
			});

			const data = await client
				.get<{ message: string }>("/unwrap-ok")
				.unwrap();
			expect(data).toEqual({ message: "unwrapped data" });
		});

		it("throws error with .unwrap() when request fails", async () => {
			const client = createHttpClient();
			(client as any).defaults.adapter = async () => {
				const error: any = new Error("Not Found");
				error.response = {
					status: 404,
					data: { error: "Resource not found" },
				};
				throw error;
			};

			await expect(client.get("/unwrap-fail").unwrap()).rejects.toThrow();

			// With custom onError handler
			await expect(
				client
					.get("/unwrap-fail-custom")
					.onError((data, status) => {
						return new Error(`Custom ${status}: ${data.error}`);
					})
					.unwrap()
			).rejects.toThrow("Custom 404: Resource not found");
		});

		it("handles errors thrown inside the onError callback gracefully", async () => {
			const client = createHttpClient();
			(client as any).defaults.adapter = async () => {
				const error: any = new Error("Server error");
				error.response = { status: 500 };
				throw error;
			};

			const res = await client.get("/throw-in-onerror").onError(() => {
				throw new Error("Error in handler");
			});

			expect(res.error).toBeDefined();
			expect((res.error as unknown as Error).message).toBe(
				"Error in handler"
			);
		});
	});

	describe("HTTP execution & response payload", () => {
		it("executes successful HTTP requests returning data, status, headers, and ok flag", async () => {
			const client = createHttpClient();
			const mockResponse = {
				data: { success: true },
				status: 200,
				statusText: "OK",
				headers: { "content-type": "application/json" },
			};
			(client as any).defaults.adapter = async () => mockResponse;

			const res = await client.get("/success");
			expect(res.data).toEqual({ success: true });
			expect(res.status).toBe(200);
			expect(res.ok).toBe(true);
			expect(res.headers).toMatchObject({
				"content-type": "application/json",
			});
		});

		it("handles request execution error in executor with and without custom onError", async () => {
			const client = createHttpClient({
				baseURL: "http://127.0.0.1:12345",
				timeout: 100,
				retryConfig: { retries: 0 },
			});

			// Without custom onError handler
			const res1 = await client.get("/fail");
			expect(res1.error).toBeDefined();
			expect(res1.ok).toBe(false);

			// With custom onError handler when response has status/data
			(client as any).defaults.adapter = async () => {
				const error: any = new Error("Network Error");
				error.response = { status: 400, data: { detail: "bad" } };
				throw error;
			};

			const res2 = await client.get("/fail").onError((data, status) => {
				return { customErr: true, status, data };
			});
			expect(res2.error).toEqual({
				customErr: true,
				status: 400,
				data: { detail: "bad" },
			});
			expect(res2.ok).toBe(false);
		});

		it("provides underlying error to onError callback as 3rd parameter", async () => {
			const client = createHttpClient();
			(client as any).defaults.adapter = async () => {
				const error: any = new Error("Failed transport");
				error.code = "ETIMEDOUT";
				throw error;
			};

			let capturedErr: any;
			const res = await client
				.get("/transport-fail")
				.onError((_data, _status, err) => {
					capturedErr = err;
					return { timedOut: true };
				});

			expect(res.error).toEqual({ timedOut: true });
			expect(capturedErr?.code).toBe("ETIMEDOUT");
		});

		it("supports request cancellation with AbortController", async () => {
			const client = createHttpClient();
			const controller = new AbortController();

			(client as any).defaults.adapter = async (config: any) => {
				if (config.signal?.aborted) {
					const cancelErr: any = new Error("canceled");
					cancelErr.__CANCEL__ = true;
					cancelErr.code = "ERR_CANCELED";
					throw cancelErr;
				}
				return {
					data: { ok: true },
					status: 200,
					statusText: "OK",
					headers: {},
				};
			};

			controller.abort();
			const res = await client.get("/cancel-test", {
				signal: controller.signal,
			});
			expect(res.error).toBeDefined();
			expect(res.ok).toBe(false);
		});
	});

	describe("client inheritance & factories", () => {
		it("creates child client with create()", () => {
			const parent = createHttpClient({
				baseURL: "https://api.parent.com",
			});
			const child = parent.create({
				baseURL: "https://api.child.com",
			});

			expect(child).toBeDefined();
			expect(typeof child.get).toBe("function");
			expect(child.defaults.baseURL).toBe("https://api.child.com");
		});

		it("extends parent client with extend() merging headers and config", () => {
			const parent = createHttpClient({
				baseURL: "https://api.parent.com",
				headers: { "x-parent": "true" },
			});
			const extended = parent.extend({
				headers: { "x-child": "true" },
			});

			expect(extended).toBeDefined();
			expect(extended.defaults.baseURL).toBe("https://api.parent.com");
			expect((extended.defaults.headers as any)["x-parent"]).toBe("true");
			expect((extended.defaults.headers as any)["x-child"]).toBe("true");
		});
	});

	describe("retry behavior & conditions", () => {
		it("evaluates default retryCondition for network errors, 5xx errors, non-5xx errors, and status-less errors", async () => {
			// GET request network error (isNetworkOrIdempotentRequestError is true -> short-circuits ||)
			const client1 = createHttpClient({
				retryConfig: { retries: 1, retryDelay: () => 0 },
			});
			let calls1 = 0;
			(client1 as any).defaults.adapter = async (config: any) => {
				calls1++;
				if (calls1 === 1) {
					const err: any = new Error("Network Error");
					err.code = "ECONNRESET";
					err.config = config;
					throw err;
				}
				return {
					data: { ok: true },
					status: 200,
					statusText: "OK",
					headers: {},
				};
			};
			await client1.get("/net-retry");
			expect(calls1).toBe(2);

			// POST request (non-idempotent so isNetworkOrIdempotentRequestError is false) with 500 error
			const client2 = createHttpClient({
				retryConfig: { retries: 1, retryDelay: () => 0 },
			});
			let calls2 = 0;
			(client2 as any).defaults.adapter = async (config: any) => {
				calls2++;
				if (calls2 === 1) {
					const err: any = new Error("Server 500");
					err.config = config;
					err.response = { status: 500 };
					throw err;
				}
				return {
					data: { ok: true },
					status: 200,
					statusText: "OK",
					headers: {},
				};
			};
			await client2.post("/post-500", { payload: 1 });
			expect(calls2).toBe(2);

			// POST request with 400 error (evaluates right side (400 ?? 0) >= 500 -> false)
			const client3 = createHttpClient({
				retryConfig: { retries: 1, retryDelay: () => 0 },
			});
			let calls3 = 0;
			(client3 as any).defaults.adapter = async (config: any) => {
				calls3++;
				const err: any = new Error("Client 400");
				err.config = config;
				err.response = { status: 400 };
				throw err;
			};
			await client3.post("/post-400", { payload: 1 });
			expect(calls3).toBe(1);

			// POST request with no response object (evaluates right side (undefined ?? 0) >= 500 -> false)
			const client4 = createHttpClient({
				retryConfig: { retries: 1, retryDelay: () => 0 },
			});
			let calls4 = 0;
			(client4 as any).defaults.adapter = async (config: any) => {
				calls4++;
				const err: any = new Error("No response error");
				err.config = config;
				err.response = undefined;
				throw err;
			};
			await client4.post("/post-no-res", { payload: 1 });
			expect(calls4).toBe(1);
		});

		it("allows disabling retries with retry: false or retryConfig: false", async () => {
			const client = createHttpClient({
				retry: false,
			});
			let calls = 0;
			(client as any).defaults.adapter = async (config: any) => {
				calls++;
				const err: any = new Error("Network Error");
				err.code = "ECONNRESET";
				err.config = config;
				throw err;
			};

			const res = await client.get("/disabled-retry");
			expect(calls).toBe(1);
			expect(res.error).toBeDefined();

			const clientWithFalseConfig = createHttpClient({
				retryConfig: false,
			});
			let callsFalseConfig = 0;
			(clientWithFalseConfig as any).defaults.adapter = async (
				config: any
			) => {
				callsFalseConfig++;
				const err: any = new Error("Network Error");
				err.code = "ECONNRESET";
				err.config = config;
				throw err;
			};

			await clientWithFalseConfig.get("/disabled-retry-2");
			expect(callsFalseConfig).toBe(1);
		});
	});
});
