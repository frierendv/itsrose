import {
	createServer,
	type IncomingMessage,
	type ServerResponse,
} from "node:http";
import type { AddressInfo } from "node:net";
import { AxiosError } from "axios";
import { createHttpClient, HttpClientError, isHttpClientError } from "../src";

/**
 * A throwaway HTTP server whose answers the test drives.
 */
interface TestServer {
	baseURL: string;
	close: () => Promise<void>;
}

/**
 * Starts a throwaway HTTP server driven by `handler`.
 *
 * @param handler Answers every request the server receives.
 */
async function startServer(
	handler: (req: IncomingMessage, res: ServerResponse) => void
): Promise<TestServer> {
	const server = createServer(handler);

	await new Promise<void>((resolve) => {
		server.listen(0, "127.0.0.1", () => resolve());
	});

	const address = server.address() as AddressInfo;

	return {
		baseURL: `http://127.0.0.1:${address.port}`,
		close: async () => {
			server.closeAllConnections();
			await new Promise<void>((resolve) => {
				server.close(() => resolve());
			});
		},
	};
}

/**
 * Pins the way the client maps transport and server failures onto an error.
 *
 * The mapping is part of the client's contract, so it is observed through
 * real requests instead of being asserted about the error class.
 */
describe("internal/http-client error mapping", () => {
	it("maps a server failure onto an error that carries the response", async () => {
		const server = await startServer((_req, res) => {
			res.writeHead(418, "I am a teapot").end("nope");
		});

		try {
			const client = createHttpClient({
				baseURL: server.baseURL,
				retry: false,
			});

			const result = await client.get("/teapot");

			expect(result.ok).toBe(false);
			expect(result.status).toBe(418);
			expect(result.data).toBe("nope");

			const error = result.error as HttpClientError;
			expect(isHttpClientError(error)).toBe(true);
			expect(error.status).toBe(418);
			expect(error.statusText).toBe("I am a teapot");
			expect(error.url).toBe("/teapot");
			expect(error.method).toBe("get");
			expect(error.response?.data).toBe("nope");
			expect(error.config?.url).toBe("/teapot");
			// The server answered, so this is not a transport failure.
			expect(error.isNetworkError).toBe(false);
			expect(error.isTimeout).toBe(false);
			expect(error.isCanceled).toBe(false);
		} finally {
			await server.close();
		}
	});

	it("maps a network failure onto a transport error", async () => {
		const server = await startServer((_req, res) => {
			res.socket?.destroy();
		});

		try {
			const client = createHttpClient({
				baseURL: server.baseURL,
				retry: false,
				throwOnError: false,
			});

			const result = await client.get("/unreachable");

			expect(result.ok).toBe(false);
			expect(result.status).toBeUndefined();

			const error = result.error as HttpClientError;
			expect(error.isNetworkError).toBe(true);
			expect(error.isTimeout).toBe(false);
			expect(error.isCanceled).toBe(false);
		} finally {
			await server.close();
		}
	});

	it("maps a timeout onto a timeout error", async () => {
		const server = await startServer(() => {
			// Never answers: the client has to give up on its own.
		});

		try {
			const client = createHttpClient({
				baseURL: server.baseURL,
				retry: false,
				throwOnError: false,
				timeout: 50,
			});

			const result = await client.get("/too-slow");

			expect(result.ok).toBe(false);

			const error = result.error as HttpClientError;
			expect(error.isTimeout).toBe(true);
			expect(error.isNetworkError).toBe(false);
			expect(error.isCanceled).toBe(false);
		} finally {
			await server.close();
		}
	});

	it("maps an aborted request onto a cancelled error", async () => {
		const server = await startServer(() => {
			// Never answers: the request is cancelled while it is in flight.
		});

		try {
			const client = createHttpClient({
				baseURL: server.baseURL,
				retry: false,
				throwOnError: false,
			});

			const controller = new AbortController();
			const pending = client.get("/cancelled", {
				signal: controller.signal,
			});
			controller.abort();

			const result = await pending;

			expect(result.ok).toBe(false);

			const error = result.error as HttpClientError;
			expect(error.isCanceled).toBe(true);
			expect(error.isNetworkError).toBe(false);
		} finally {
			await server.close();
		}
	});

	it("hands the normalized error to the error handler", async () => {
		const server = await startServer((_req, res) => {
			res.writeHead(500).end("boom");
		});

		try {
			const client = createHttpClient({
				baseURL: server.baseURL,
				retry: false,
				onError: (data, error) => ({
					message: "handled",
					status: error.status,
					body: data,
				}),
			});

			const result = await client.get("/handled");

			expect(result.ok).toBe(false);
			expect(result.error).toEqual({
				message: "handled",
				status: 500,
				body: "boom",
			});
		} finally {
			await server.close();
		}
	});

	it("serializes the error it reports", () => {
		const error = HttpClientError.from(
			new AxiosError(
				"Request failed with status code 404",
				"ERR_BAD_REQUEST",
				{
					url: "/missing",
					method: "get",
				} as never
			)
		);

		const serialized = error.toJSON();

		expect(serialized).toMatchObject({
			name: "HttpClientError",
			message: "Request failed with status code 404",
			code: "ERR_BAD_REQUEST",
			url: "/missing",
			method: "get",
			// A coded failure without a response is a transport failure as far
			// as the client is concerned.
			isNetworkError: true,
			isTimeout: false,
			isCanceled: false,
		});
		expect(typeof serialized.stack).toBe("string");
	});

	it("does not report an uncoded failure as a transport failure", () => {
		const error = HttpClientError.from(new Error("something went wrong"));

		expect(error.isNetworkError).toBe(false);
		expect(error.isTimeout).toBe(false);
		expect(error.isCanceled).toBe(false);
	});
});
