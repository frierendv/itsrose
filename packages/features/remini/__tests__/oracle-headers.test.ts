import {
	createServer,
	type IncomingMessage,
	type ServerResponse,
} from "node:http";
import type { AddressInfo } from "node:net";
import { Client } from "../src/client/client";
import type { OracleSetupResponse } from "../src/types";

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
 * The payload the oracle answers its setup call with.
 */
const SETUP_RESPONSE: OracleSetupResponse = {
	me: {
		unique_id: "user-1",
		authentication: {
			identity_token: "identity-token",
			refresh_token: null,
			auth_url: "https://remini.example.com/auth",
		},
	},
	settings: {
		__identity__: {
			token: "tok123",
			expiration: "2999-01-01T00:00:00.000Z",
		},
	},
	default_settings_url: "https://remini.example.com/settings",
	overrides_url: "https://remini.example.com/overrides",
};

/**
 * Starts a throwaway HTTP server that answers the oracle setup call and
 * records the requests it received.
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

		const body =
			req.url === "/v1/mobile/oracle/setup"
				? JSON.stringify(SETUP_RESPONSE)
				: JSON.stringify({ ok: true });

		res.writeHead(200, { "Content-Type": "application/json" }).end(body);
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

describe("features/remini oracle headers", () => {
	let server: TestServer;
	let client: Client;

	beforeEach(async () => {
		server = await startServer();
		// eslint-disable-next-line turbo/no-undeclared-env-vars
		process.env.REMINI_API_BASE_URL = server.baseURL;
		// eslint-disable-next-line turbo/no-undeclared-env-vars
		process.env.REMINI_WSS_BASE_URL = "wss://remini.example.com";
		client = new Client();
	});

	afterEach(async () => {
		await server.close();
	});

	it("sends the oracle credentials on every request made after the setup", async () => {
		await client.oracle.initialize();

		await client.ping();

		const ping = server.requests.find(
			(request) => request.url === "/system/ping"
		);

		expect(ping?.headers["identity-token"]).toBe("tok123");
		expect(ping?.headers["iris-access-token"]).toBe("tok123");
		expect(ping?.headers.aaid).toBeDefined();
		expect(ping?.headers["android-id"]).toBeDefined();
	});

	it("sends the oracle credentials on the setup call itself", async () => {
		await client.oracle.initialize();

		const setup = server.requests.find(
			(request) => request.url === "/v1/mobile/oracle/setup"
		);

		expect(setup?.headers.aaid).toBeDefined();
		expect(setup?.headers["android-id"]).toBeDefined();
	});
});
