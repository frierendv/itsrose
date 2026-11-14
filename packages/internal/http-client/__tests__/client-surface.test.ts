import {
	createServer,
	type IncomingMessage,
	type ServerResponse,
} from "node:http";
import type { AddressInfo } from "node:net";
import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";
import { AxiosHeaders, type AxiosInstance } from "axios";
import { applyDefaultHeader, createHttpClient, HttpClient } from "../src";

/**
 * A throwaway HTTP server that records every request it receives.
 */
interface RecordedRequest {
	headers: Record<string, string | undefined>;
	url: string;
}

interface TestServer {
	baseURL: string;
	requests: RecordedRequest[];
	close: () => Promise<void>;
}

/**
 * Starts a throwaway HTTP server that answers `200` with a JSON body and
 * records the requests it received.
 */
async function startServer(): Promise<TestServer> {
	const requests: RecordedRequest[] = [];

	const server = createServer((req: IncomingMessage, res: ServerResponse) => {
		requests.push({
			headers: Object.fromEntries(
				Object.entries(req.headers).map(([name, value]) => [
					name,
					Array.isArray(value) ? value.join(",") : value,
				])
			),
			url: req.url ?? "",
		});
		res.writeHead(200, { "Content-Type": "application/json" }).end(
			JSON.stringify({ ok: true })
		);
	});

	await new Promise<void>((resolve) => {
		server.listen(0, "127.0.0.1", () => resolve());
	});

	const address = server.address() as AddressInfo;

	return {
		baseURL: `http://127.0.0.1:${address.port}`,
		requests,
		close: async () => {
			server.closeAllConnections();
			await new Promise<void>((resolve) => {
				server.close(() => resolve());
			});
		},
	};
}

describe("internal/http-client public surface", () => {
	it("no longer hands out the transport's internals", () => {
		const client = new HttpClient();
		const callable = createHttpClient();

		const readMember = (target: object, name: string): unknown =>
			(target as Record<string, unknown>)[name];

		for (const escapeHatch of [
			"interceptors",
			"defaults",
			"axiosInstance",
		]) {
			expect(escapeHatch in client).toBe(false);
			expect(escapeHatch in callable).toBe(false);
			expect(readMember(client, escapeHatch)).toBeUndefined();
			expect(readMember(callable, escapeHatch)).toBeUndefined();
		}
	});

	it("keeps the client configuration readable", () => {
		const client = createHttpClient({ baseURL: "https://api.example.com" });

		expect(client.config?.baseURL).toBe("https://api.example.com");
	});
});

describe("internal/http-client request hook", () => {
	let server: TestServer;

	beforeEach(async () => {
		server = await startServer();
	});

	afterEach(async () => {
		await server.close();
	});

	it("sees the resolved base URL of the request", async () => {
		const seen: (string | undefined)[] = [];

		const client = createHttpClient({
			baseURL: server.baseURL,
			adapter: async (config) => {
				seen.push(config.baseURL);
				return {
					data: { ok: true },
					status: 200,
					statusText: "OK",
					headers: {},
					config,
				};
			},
			requestTransform: (config) => {
				seen.push(config.baseURL);
				return config;
			},
		});

		await client.get("/default-base");
		await client.get("/overridden-base", {
			baseURL: "https://other.example.com",
		});

		expect(seen).toEqual([
			server.baseURL,
			server.baseURL,
			"https://other.example.com",
			"https://other.example.com",
		]);
	});

	it("can rewrite the outgoing request", async () => {
		const client = createHttpClient({
			baseURL: server.baseURL,
			requestTransform: (config) => ({
				...config,
				params: { ...config.params, signed: "yes" },
				headers: config.headers,
			}),
		});

		await client.get("/rewritten");

		expect(server.requests[0]?.url).toBe("/rewritten?signed=yes");
	});

	it("can set a header on the outgoing request", async () => {
		const client = createHttpClient({
			baseURL: server.baseURL,
			requestTransform: (config) => {
				config.headers.set("x-signed", "yes");
				return config;
			},
		});

		await client.get("/signed");

		expect(server.requests[0]?.headers["x-signed"]).toBe("yes");
	});
});

describe("internal/http-client response hook", () => {
	let server: TestServer;

	beforeEach(async () => {
		server = await startServer();
	});

	afterEach(async () => {
		await server.close();
	});

	it("can rewrite the response before it reaches the caller", async () => {
		const client = createHttpClient({
			baseURL: server.baseURL,
			responseTransform: (response) => ({
				...response,
				data: { ...(response.data as object), tagged: true },
			}),
		});

		const result = await client.get<{ ok: boolean; tagged?: boolean }>(
			"/tagged"
		);

		expect(result.data).toEqual({ ok: true, tagged: true });
	});

	it("rejects the request when it throws", async () => {
		const client = createHttpClient({
			baseURL: server.baseURL,
			throwOnError: false,
			responseTransform: () => {
				throw new Error("business failure");
			},
		});

		const result = await client.get("/rejected");

		expect(result.ok).toBe(false);
		expect(result.error).toBeDefined();
	});
});

describe("internal/http-client default headers", () => {
	let server: TestServer;

	beforeEach(async () => {
		server = await startServer();
	});

	afterEach(async () => {
		await server.close();
	});

	it("sends a header set after the client was created", async () => {
		const client = createHttpClient({ baseURL: server.baseURL });

		client.setDefaultHeader("x-late", "late-value");

		await client.get("/late-header");

		expect(server.requests[0]?.headers["x-late"]).toBe("late-value");
	});

	it("sends several headers set at once", async () => {
		const client = createHttpClient({ baseURL: server.baseURL });

		client.setDefaultHeaders({
			"x-first": "one",
			"x-second": "two",
		});

		await client.get("/default-headers");

		expect(server.requests[0]?.headers["x-first"]).toBe("one");
		expect(server.requests[0]?.headers["x-second"]).toBe("two");
	});

	it("writes the header into a header bag that exposes the Axios API", () => {
		const common = new AxiosHeaders();
		const instance = {
			defaults: { headers: { common } },
		} as unknown as AxiosInstance;

		applyDefaultHeader(instance, "x-bag", "value");

		expect(common.get("x-bag")).toBe("value");
	});
});

describe("internal/http-client transport seam", () => {
	it("uses the configured adapter instead of the network", async () => {
		const seen: InternalAxiosRequestConfig[] = [];

		const adapter = async (
			config: InternalAxiosRequestConfig
		): Promise<AxiosResponse> => {
			seen.push(config);
			return {
				data: { stubbed: true },
				status: 200,
				statusText: "OK",
				headers: {},
				config,
			};
		};

		const client = createHttpClient({
			baseURL: "https://api.example.com",
			adapter,
		});

		const result = await client.get<{ stubbed: boolean }>("/stubbed");

		expect(result.ok).toBe(true);
		expect(result.data).toEqual({ stubbed: true });
		expect(seen).toHaveLength(1);
		expect(seen[0]?.url).toBe("/stubbed");
	});
});
