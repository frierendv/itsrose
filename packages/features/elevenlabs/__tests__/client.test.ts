import {
	createServer,
	type IncomingMessage,
	type ServerResponse,
} from "node:http";
import type { AddressInfo } from "node:net";
import { UpstreamApiError } from "@itsrose/upstream-client";

// The client reads its key from the environment when it is imported, so the
// environment has to be in place before the package is loaded.
// eslint-disable-next-line turbo/no-undeclared-env-vars
process.env.ELEVENLABS_API_KEY = "test-key";

interface RecordedRequest {
	method: string;
	url: string;
	headers: Record<string, string | undefined>;
}

interface TestServer {
	baseURL: string;
	requests: RecordedRequest[];
	close: () => Promise<void>;
}

/**
 * Starts a throwaway HTTP server that records the requests it received.
 *
 * @param handler The answer the server gives.
 * @returns The server and its base URL.
 */
async function startServer(
	handler: (req: IncomingMessage, res: ServerResponse) => void
): Promise<TestServer> {
	const requests: RecordedRequest[] = [];

	const server = createServer((req: IncomingMessage, res: ServerResponse) => {
		requests.push({
			method: req.method ?? "",
			url: req.url ?? "",
			headers: Object.fromEntries(
				Object.entries(req.headers).map(([name, value]) => [
					name,
					Array.isArray(value) ? value.join(",") : value,
				])
			),
		});
		handler(req, res);
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
 * A voice as the upstream sends it, with every field the published schema
 * requires.
 */
const VOICE = {
	voice_id: "voice-1",
	name: "A voice",
	samples: null,
	category: "premade",
	fine_tuning: null,
	labels: {},
	description: "A description",
	preview_url: null,
	available_for_tiers: [],
	settings: null,
	sharing: null,
	high_quality_base_model_ids: [],
	verified_languages: [],
	collection_ids: [],
	safety_control: null,
	voice_verification: null,
	permission_on_resource: null,
	is_owner: false,
	is_legacy: false,
	is_mixed: false,
	favorited_at_unix: null,
	created_at_unix: null,
	is_bookmarked: false,
	recording_quality: null,
	labelling_status: null,
	recording_quality_reason: null,
};

describe("features/elevenlabs upstream client", () => {
	let server: TestServer;

	beforeAll(async () => {
		server = await startServer((_req, res) => {
			res.writeHead(200, { "Content-Type": "application/json" }).end(
				JSON.stringify({
					voices: [VOICE],
					has_more: false,
					total_count: 1,
					next_page_token: null,
				})
			);
		});
	});

	afterAll(async () => {
		await server.close();
	});

	it("sends the request the upstream expects", async () => {
		const { createElevenLabsClient } = await import("../src/client/client");
		const { ElevenLabsListVoicesResponseSchema } =
			await import("../src/zod-schema");

		const client = createElevenLabsClient({
			baseURL: server.baseURL,
			apiKey: "test-key",
		});

		await client.send({
			url: "/v2/voices",
			params: { page_size: 10 },
			schema: ElevenLabsListVoicesResponseSchema,
		});

		const request = server.requests[0];

		expect(request?.method).toBe("GET");
		expect(request?.url).toContain("/v2/voices");
		expect(request?.url).toContain("page_size=10");
		expect(request?.headers["xi-api-key"]).toBe("test-key");
	});

	it("maps an upstream failure onto the shared failure", async () => {
		const { createElevenLabsClient } = await import("../src/client/client");

		const failing = await startServer((_req, res) => {
			res.writeHead(401, { "Content-Type": "application/json" }).end(
				JSON.stringify({
					detail: {
						status: "invalid_api_key",
						message: "Invalid API key",
					},
				})
			);
		});

		try {
			const client = createElevenLabsClient({
				baseURL: failing.baseURL,
				apiKey: "wrong-key",
			});

			const failure = await client
				.send({ url: "/v1/models" })
				.catch((error: unknown) => error);

			expect(failure).toBeInstanceOf(UpstreamApiError);
			expect((failure as UpstreamApiError).message).toBe(
				"Invalid API key"
			);
			expect((failure as UpstreamApiError).statusCode).toBe(401);
			expect((failure as UpstreamApiError).service).toBe("elevenlabs");
			expect((failure as UpstreamApiError).upstreamStatus).toBe(401);
		} finally {
			await failing.close();
		}
	});

	it("rejects a payload that does not match the published schema", async () => {
		const { createElevenLabsClient } = await import("../src/client/client");
		const { ElevenLabsListVoicesResponseSchema } =
			await import("../src/zod-schema");

		const drifting = await startServer((_req, res) => {
			res.writeHead(200, { "Content-Type": "application/json" }).end(
				JSON.stringify({ voices: [{ name: "no id" }] })
			);
		});

		try {
			const client = createElevenLabsClient({
				baseURL: drifting.baseURL,
				apiKey: "test-key",
			});

			const failure = await client
				.send({
					url: "/v2/voices",
					schema: ElevenLabsListVoicesResponseSchema,
				})
				.catch((error: unknown) => error);

			expect(failure).toBeInstanceOf(UpstreamApiError);
			expect((failure as UpstreamApiError).isSchemaMismatch).toBe(true);
			expect((failure as UpstreamApiError).message).toContain("voice_id");
		} finally {
			await drifting.close();
		}
	});
});

describe("features/elevenlabs getVoices redaction", () => {
	it("removes the personal data a voice carries", async () => {
		const { httpClient } = await import("../src/client/client");
		const { getVoices } = await import("../src/elevenlabs/voices");

		const spy = jest.spyOn(httpClient, "send").mockResolvedValue({
			voices: [
				{
					...VOICE,
					name: "Reach me at person@example.com",
					description:
						"Call +62 812-3456-7890 or see https://x.test/me",
				},
			],
			has_more: false,
			total_count: 1,
			next_page_token: null,
		});

		try {
			const voices = await getVoices();

			expect(voices.voices[0]?.name).toBe("Reach me at [EMAIL]");
			expect(voices.voices[0]?.description).toBe(
				"Call +[PHONE] or see [URL]"
			);
		} finally {
			spy.mockRestore();
		}
	});
});
