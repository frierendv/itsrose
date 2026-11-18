import {
	createServer,
	type IncomingMessage,
	type ServerResponse,
} from "node:http";
import type { AddressInfo } from "node:net";

/**
 * A request the stub server received.
 */
export interface RecordedRequest {
	method: string;
	url: string;
	headers: Record<string, string | undefined>;
	body: string;
}

/**
 * A throwaway upstream that answers with what the test says.
 */
export interface TestServer {
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
 * @param handler The answer the server gives, per attempt.
 * @returns The server and its base URL.
 */
export async function startServer(
	handler: (
		req: IncomingMessage,
		res: ServerResponse,
		attempt: number
	) => void
): Promise<TestServer> {
	const requests: RecordedRequest[] = [];
	let attempts = 0;

	const server = createServer((req, res) => {
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
 * Answers with a JSON payload.
 *
 * @param res The response to write.
 * @param payload The payload to write.
 * @param status The HTTP status to answer with.
 */
export function json(
	res: ServerResponse,
	payload: unknown,
	status = 200
): void {
	res.writeHead(status, { "content-type": "application/json" });
	res.end(JSON.stringify(payload));
}

/**
 * A successful PixVerse envelope.
 *
 * @param resp The payload inside the envelope.
 * @returns The envelope.
 */
export function envelope<T>(resp: T): {
	ErrCode: number;
	ErrMsg: string;
	Resp: T;
} {
	return { ErrCode: 0, ErrMsg: "Success", Resp: resp };
}
