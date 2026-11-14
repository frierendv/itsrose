import {
	createServer,
	type IncomingMessage,
	type ServerResponse,
} from "node:http";
import type { AddressInfo } from "node:net";
import { ThirdPartyApiError } from "@itsrose/system";
import { z } from "zod/v4";
import {
	createUpstreamClient,
	neverRetry,
	parseUpstreamPayload,
	UpstreamApiError,
} from "../src";

interface RecordedRequest {
	method: string;
	url: string;
	headers: Record<string, string | undefined>;
	body: string;
}

interface TestServer {
	baseURL: string;
	requests: RecordedRequest[];
	close: () => Promise<void>;
}

/**
 * Reads the whole request body.
 *
 * @param req The incoming request.
 * @returns The body as a string.
 */
async function readBody(req: IncomingMessage): Promise<string> {
	const chunks: Buffer[] = [];
	for await (const chunk of req) {
		chunks.push(Buffer.from(chunk));
	}
	return Buffer.concat(chunks).toString("utf8");
}

/**
 * Starts a throwaway HTTP server that records the requests it received.
 *
 * @param handler The answer the server gives.
 * @returns The server and its base URL.
 */
async function startServer(
	handler: (
		req: IncomingMessage,
		res: ServerResponse,
		attempt: number
	) => void
): Promise<TestServer> {
	const requests: RecordedRequest[] = [];
	let attempts = 0;

	const server = createServer((req: IncomingMessage, res: ServerResponse) => {
		attempts += 1;
		void readBody(req).then((body) => {
			requests.push({
				method: req.method ?? "",
				url: req.url ?? "",
				headers: Object.fromEntries(
					Object.entries(req.headers).map(([name, value]) => [
						name,
						Array.isArray(value) ? value.join(",") : value,
					])
				),
				body,
			});
			handler(req, res, attempts);
		});
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

/**
 * Answers every request with `200` and the given JSON body.
 *
 * @param body The body the server answers with.
 * @returns A server handler.
 */
function answerWith(body: unknown) {
	return (_req: IncomingMessage, res: ServerResponse): void => {
		res.writeHead(200, { "Content-Type": "application/json" }).end(
			JSON.stringify(body)
		);
	};
}

describe("internal/upstream-client", () => {
	describe("the request it sends", () => {
		it("sends the method, the url, the headers and the body the caller asked for", async () => {
			const server = await startServer(answerWith({ ok: true }));

			try {
				const client = createUpstreamClient({
					service: "stub",
					baseURL: server.baseURL,
					headers: { "x-api-key": "secret" },
				});

				await client.send({
					url: "/v1/models",
					method: "post",
					data: { prompt: "hello" },
					headers: { "x-request-id": "req-1" },
				});

				const request = server.requests[0];

				expect(request?.method).toBe("POST");
				expect(request?.url).toBe("/v1/models");
				expect(request?.headers["x-api-key"]).toBe("secret");
				expect(request?.headers["x-request-id"]).toBe("req-1");
				expect(JSON.parse(request?.body ?? "{}")).toEqual({
					prompt: "hello",
				});
			} finally {
				await server.close();
			}
		});

		it("keeps the query parameters of the request", async () => {
			const server = await startServer(answerWith({ ok: true }));

			try {
				const client = createUpstreamClient({
					service: "stub",
					baseURL: server.baseURL,
				});

				await client.send({
					url: "/v2/voices",
					params: { page_size: 10 },
				});

				expect(server.requests[0]?.url).toBe("/v2/voices?page_size=10");
			} finally {
				await server.close();
			}
		});
	});

	describe("the failure it raises", () => {
		it("raises the shared failure when the upstream answers with a non-2xx status", async () => {
			const server = await startServer((_req, res) => {
				res.writeHead(404, { "Content-Type": "application/json" }).end(
					JSON.stringify({ detail: "voice not found" })
				);
			});

			try {
				const client = createUpstreamClient({
					service: "stub",
					baseURL: server.baseURL,
				});

				const failure = await client
					.send({ url: "/v2/voices" })
					.catch((error: unknown) => error);

				expect(failure).toBeInstanceOf(UpstreamApiError);
				// The shared failure is a third-party failure, so the shared
				// route surface still maps it onto the upstream envelope.
				expect(failure).toBeInstanceOf(ThirdPartyApiError);
				expect((failure as UpstreamApiError).service).toBe("stub");
				expect((failure as UpstreamApiError).upstreamStatus).toBe(404);
				expect((failure as UpstreamApiError).statusCode).toBe(500);
				expect((failure as UpstreamApiError).isSchemaMismatch).toBe(
					false
				);
				expect((failure as UpstreamApiError).details).toEqual({
					detail: "voice not found",
				});
			} finally {
				await server.close();
			}
		});

		it("uses the mapper of the package to describe the failure", async () => {
			const server = await startServer((_req, res) => {
				res.writeHead(401, { "Content-Type": "application/json" }).end(
					JSON.stringify({ detail: "invalid api key" })
				);
			});

			try {
				const client = createUpstreamClient({
					service: "elevenlabs",
					baseURL: server.baseURL,
					mapError: (payload, context) => ({
						message: `upstream said ${JSON.stringify(payload)} at ${context.status}`,
						statusCode: context.status ?? 500,
					}),
				});

				const failure = await client
					.send({ url: "/v1/models" })
					.catch((error: unknown) => error);

				expect(failure).toBeInstanceOf(UpstreamApiError);
				expect((failure as UpstreamApiError).message).toContain(
					"invalid api key"
				);
				expect((failure as UpstreamApiError).statusCode).toBe(401);
			} finally {
				await server.close();
			}
		});

		it("raises the shared failure when the upstream cannot be reached", async () => {
			const server = await startServer(answerWith({ ok: true }));
			const baseURL = server.baseURL;
			await server.close();

			const client = createUpstreamClient({
				service: "stub",
				baseURL,
				retry: { retries: 0 },
			});

			const failure = await client
				.send({ url: "/v1/models" })
				.catch((error: unknown) => error);

			expect(failure).toBeInstanceOf(UpstreamApiError);
			expect(
				(failure as UpstreamApiError).upstreamStatus
			).toBeUndefined();
			expect((failure as UpstreamApiError).statusCode).toBe(500);
		});
	});

	describe("the schema it applies", () => {
		const VoiceSchema = z.object({
			voice_id: z.string(),
			name: z.string().default("unnamed"),
		});

		it("applies the schema to the payload", async () => {
			const server = await startServer(
				answerWith({ voice_id: "voice-1" })
			);

			try {
				const client = createUpstreamClient({
					service: "stub",
					baseURL: server.baseURL,
				});

				const voice = await client.send({
					url: "/v2/voices",
					schema: VoiceSchema,
				});

				expect(voice).toEqual({ voice_id: "voice-1", name: "unnamed" });
			} finally {
				await server.close();
			}
		});

		it("rejects a payload that does not match the schema", async () => {
			const server = await startServer(
				answerWith({ voice: { id: "voice-1" } })
			);

			try {
				const client = createUpstreamClient({
					service: "stub",
					baseURL: server.baseURL,
				});

				const failure = await client
					.send({ url: "/v2/voices", schema: VoiceSchema })
					.catch((error: unknown) => error);

				expect(failure).toBeInstanceOf(UpstreamApiError);
				expect((failure as UpstreamApiError).isSchemaMismatch).toBe(
					true
				);
				expect((failure as UpstreamApiError).statusCode).toBe(500);
				expect((failure as UpstreamApiError).message).toContain(
					"voice_id"
				);
			} finally {
				await server.close();
			}
		});

		it("raises the shared failure for a payload that does not match", () => {
			const failure = (() => {
				try {
					parseUpstreamPayload(
						VoiceSchema,
						{ name: "no id" },
						{
							service: "stub",
							label: "voice",
						}
					);
					return undefined;
				} catch (error) {
					return error;
				}
			})();

			expect(failure).toBeInstanceOf(UpstreamApiError);
			expect((failure as UpstreamApiError).service).toBe("stub");
			expect((failure as UpstreamApiError).isSchemaMismatch).toBe(true);
			expect((failure as UpstreamApiError).message).toContain("voice");
		});
	});

	describe("the retry policy", () => {
		it("retries a 5xx under the shared contract", async () => {
			const server = await startServer((_req, res, attempt) => {
				if (attempt < 3) {
					res.writeHead(503).end("unavailable");
					return;
				}
				res.writeHead(200, { "Content-Type": "application/json" }).end(
					JSON.stringify({ recovered: true })
				);
			});

			try {
				const client = createUpstreamClient({
					service: "stub",
					baseURL: server.baseURL,
					retry: { retryDelay: () => 0 },
				});

				const payload = await client.send<{ recovered: boolean }>({
					url: "/v1/models",
				});

				expect(server.requests).toHaveLength(3);
				expect(payload).toEqual({ recovered: true });
			} finally {
				await server.close();
			}
		});

		it("does not retry a 4xx — the server's answer is not a blip", async () => {
			const server = await startServer((_req, res) => {
				res.writeHead(404).end("missing");
			});

			try {
				const client = createUpstreamClient({
					service: "stub",
					baseURL: server.baseURL,
					retry: { retryDelay: () => 0 },
				});

				await client.send({ url: "/v1/models" }).catch(() => undefined);

				expect(server.requests).toHaveLength(1);
			} finally {
				await server.close();
			}
		});

		it("does not replay a call whose policy was narrowed", async () => {
			const server = await startServer((_req, res) => {
				res.writeHead(500).end("boom");
			});

			try {
				const client = createUpstreamClient({
					service: "stub",
					baseURL: server.baseURL,
					retry: { retryDelay: () => 0 },
				});

				await client
					.send({
						url: "/v1/tasks",
						method: "post",
						retry: { retryCondition: neverRetry },
					})
					.catch(() => undefined);

				expect(server.requests).toHaveLength(1);
			} finally {
				await server.close();
			}
		});
	});
});
