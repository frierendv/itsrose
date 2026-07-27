import { createHttpClient, fetcher } from "../src";

describe("internal/http-client", () => {
	it("exports fetcher as a default http client instance", () => {
		expect(fetcher).toBeDefined();
		expect(typeof fetcher.get).toBe("function");
		expect(typeof fetcher.post).toBe("function");
	});

	it("creates a client instance with custom configuration", () => {
		const client = createHttpClient({
			baseURL: "https://api.example.com",
			timeout: 5000,
		});
		expect(client).toBeDefined();
		expect(typeof client.get).toBe("function");
	});

	it("has axios like features", () => {
		const client = createHttpClient({
			baseURL: "https://api.example.com",
		});
		const features = ["interceptors", "defaults", "getUri", "defaults"];

		for (const feature of features) {
			expect((client as any)[feature]).toBeDefined();
		}

		expect(typeof (client as any).get).toBe("function");
		expect(typeof (client as any).post).toBe("function");
	});

	it("supports wrapped client HTTP methods", () => {
		const client = createHttpClient({
			baseURL: "https://api.example.com",
		});
		const methodWithoutBody = ["get", "delete", "head", "options"];
		const methodWithBody = ["post", "patch", "put"];

		expect(client.request({ url: "/test" })).toBeDefined();
		for (const method of methodWithoutBody) {
			expect((client as any)[method]("/test")).toBeDefined();
		}
		for (const method of methodWithBody) {
			expect((client as any)[method]("/test", { a: 1 })).toBeDefined();
		}
	});

	it("creates request builder with chainable onError handler", async () => {
		const client = createHttpClient({
			baseURL: "https://httpbin.org",
		});
		const builder = client.get("/get").onError((err) => ({
			message: err.message,
			statusCode: 500,
		}));

		expect(typeof builder.then).toBe("function");
		expect(typeof builder.onError).toBe("function");
	});

	it("executes successful HTTP requests returning data, status, and headers", async () => {
		const client = createHttpClient();
		const mockResponse = {
			data: { success: true },
			status: 200,
			statusText: "OK",
			headers: {},
		};
		(client as any).defaults.adapter = async () => mockResponse;

		const res = await client.get("/success");
		expect(res.data).toEqual({ success: true });
		expect(res.status).toBe(200);
	});

	it("handles request execution error in executor with and without custom onError", async () => {
		const client = createHttpClient({
			baseURL: "http://127.0.0.1:12345", // Non-existent server causing connection error
			timeout: 100,
			retryConfig: { retries: 0 },
		});

		// Without custom onError handler
		const res1 = await client.get("/fail");
		expect(res1.error).toBeDefined();

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
	});

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
});
