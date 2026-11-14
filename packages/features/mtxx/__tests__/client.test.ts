import {
	createServer,
	type IncomingMessage,
	type ServerResponse,
} from "node:http";
import type { AddressInfo } from "node:net";

/**
 * A throwaway HTTP server that records the requests it received.
 */
interface TestServer {
	baseURL: string;
	requests: {
		headers: Record<string, string | undefined>;
		url: string;
	}[];
	close: () => Promise<void>;
}

/**
 * Starts a throwaway HTTP server that answers `200` with an empty JSON body
 * and records the requests it received.
 */
async function startServer(): Promise<TestServer> {
	const requests: TestServer["requests"] = [];

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
			JSON.stringify({ code: 0 })
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

describe("features/mtxx client transport", () => {
	let sdkServer: TestServer;
	let openApiServer: TestServer;
	let client: InstanceType<typeof import("../src/client/client").Client>;

	beforeAll(async () => {
		sdkServer = await startServer();
		openApiServer = await startServer();

		// The client reads its endpoints from the environment when it is
		// constructed, so the environment has to be in place before the module
		// is loaded.
		// eslint-disable-next-line turbo/no-undeclared-env-vars
		process.env.MTXX_SDK_BASE_URL = sdkServer.baseURL;
		// eslint-disable-next-line turbo/no-undeclared-env-vars
		process.env.MTXX_OPENAPI_BASE_URL = openApiServer.baseURL;
		// eslint-disable-next-line turbo/no-undeclared-env-vars
		process.env.MTXX_KEY = "test-key";
		// eslint-disable-next-line turbo/no-undeclared-env-vars
		process.env.MTXX_SECRET = "test-secret";

		const module = await import("../src/client/client");
		client = new module.Client();
	});

	afterAll(async () => {
		await sdkServer.close();
		await openApiServer.close();
	});

	it("signs a request that targets the SDK base URL", async () => {
		await client.getTaskStatus("task-1");

		const request = sdkServer.requests[0];

		expect(request?.url).toBe("/api/v1/sdk/status?task_id=task-1");
		expect(request?.headers["x-sdk-date"]).toMatch(/^\d{8}T\d{6}Z$/);

		const authorization = request?.headers.authorization ?? "";
		expect(authorization).toMatch(/^Bearer /);

		const decoded = Buffer.from(
			authorization.replace(/^Bearer /, ""),
			"base64"
		).toString("utf8");
		expect(decoded).toContain("SDK-HMAC-SHA256 Access=test-key");
		expect(decoded).toContain("SignedHeaders=host;x-sdk-date");
		expect(decoded).toMatch(/Signature=[0-9a-f]{64}$/);

		// The credentials belong in the signature, never in the query string.
		expect(request?.url).not.toContain("api_key");
		expect(request?.url).not.toContain("api_secret");
	});

	it("sends the client fingerprint header on every request", async () => {
		await client.getTaskStatus("task-2");

		const fingerprint = Buffer.from(
			JSON.stringify({
				ext_info: { app_version: "12.11.5" },
				app_id: "18",
				os_type: "android",
				country_code: "ID",
				gnum: "-1",
			})
		).toString("base64");

		expect(sdkServer.requests[1]?.headers["x-mtcc-client"]).toBe(
			fingerprint
		);
	});

	it("adds the credentials to the query of a request that targets the openapi base URL", async () => {
		await client.createMtlabTask({
			url: "/api/v1/mtlab/task",
			data: { prompt: "hello" },
		});

		const request = openApiServer.requests[0];

		expect(request?.url).toContain("api_key=test-key");
		expect(request?.url).toContain("api_secret=test-secret");
		// The openapi endpoint authenticates through the query string, so the
		// request must not be signed.
		expect(request?.headers.authorization).toBeUndefined();
		expect(request?.headers["x-sdk-date"]).toBeUndefined();
	});
});
