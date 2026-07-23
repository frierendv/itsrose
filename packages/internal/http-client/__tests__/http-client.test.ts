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
});
