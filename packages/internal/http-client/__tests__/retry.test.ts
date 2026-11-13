import {
	createServer,
	type IncomingMessage,
	type Server,
	type ServerResponse,
} from "node:http";
import type { AddressInfo } from "node:net";
import { createHttpClient } from "../src";

type Handler = (
	req: IncomingMessage,
	res: ServerResponse,
	attempt: number
) => void;

/**
 * Exercises the retry policy through the client's own interface, against a
 * real server, so the policy is observed rather than asserted about.
 */
describe("internal/http-client retry policy", () => {
	let server: Server;
	let baseURL: string;
	let attempts: number;
	let handler: Handler;

	beforeAll(async () => {
		server = createServer((req, res) => {
			attempts += 1;
			handler(req, res, attempts);
		});

		await new Promise<void>((resolve) => {
			server.listen(0, "127.0.0.1", () => resolve());
		});

		const address = server.address() as AddressInfo;
		baseURL = `http://127.0.0.1:${address.port}`;
	});

	afterAll(async () => {
		server.closeAllConnections();
		await new Promise<void>((resolve) => {
			server.close(() => resolve());
		});
	});

	beforeEach(() => {
		attempts = 0;
		handler = (_req, res) => {
			res.writeHead(500).end("boom");
		};
	});

	it("retries a 5xx with the shipped defaults and succeeds once the server recovers", async () => {
		handler = (_req, res, attempt) => {
			if (attempt < 3) {
				res.writeHead(503).end("unavailable");
				return;
			}
			res.writeHead(200, { "Content-Type": "application/json" }).end(
				JSON.stringify({ recovered: true })
			);
		};

		const client = createHttpClient({ baseURL });
		const res = await client.get<{ recovered: boolean }>("/recovering");

		expect(attempts).toBe(3);
		expect(res.ok).toBe(true);
		expect(res.data).toEqual({ recovered: true });
	});

	it("does not retry a 4xx — the server's answer is not a blip", async () => {
		handler = (_req, res) => {
			res.writeHead(404).end("missing");
		};

		const client = createHttpClient({ baseURL });
		const res = await client.get("/missing");

		expect(attempts).toBe(1);
		expect(res.ok).toBe(false);
		expect(res.status).toBe(404);
	});

	it("gives up after the configured number of retries on a persistent 5xx", async () => {
		const client = createHttpClient({
			baseURL,
			retry: { retries: 2, retryDelay: () => 0 },
		});
		const res = await client.get("/always-failing");

		expect(attempts).toBe(3);
		expect(res.ok).toBe(false);
		expect(res.status).toBe(500);
	});

	it("retries a network failure — the request never reached a server", async () => {
		handler = (_req, res) => {
			res.socket?.destroy();
		};

		const client = createHttpClient({
			baseURL,
			throwOnError: false,
			retry: { retries: 2, retryDelay: () => 0 },
		});
		const res = await client.get("/network-failure");

		expect(attempts).toBe(3);
		expect(res.ok).toBe(false);
	});

	it("does not retry when retries are disabled", async () => {
		const client = createHttpClient({ baseURL, retry: false });
		const res = await client.get("/retries-off");

		expect(attempts).toBe(1);
		expect(res.ok).toBe(false);
		expect(res.status).toBe(500);
	});
});
