import {
	createServer,
	type IncomingMessage,
	type ServerResponse,
} from "node:http";
import type { AddressInfo } from "node:net";

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
 * The upstream payload as the TikWM service answers it.
 */
const UPSTREAM_PAYLOAD = {
	code: 0,
	msg: "ok",
	data: {
		id: "7312345678901234567",
		aweme_id: "7312345678901234567",
		region: "ID",
		title: "A video",
		author: {
			id: "6000000000000000000",
			unique_id: "creator",
			nickname: "Creator",
			avatar: "https://tikwm.com/avatar.jpg",
		},
		cover: "https://tikwm.com/cover.jpg",
		ai_dynamic_cover: "https://tikwm.com/ai-cover.jpg",
		origin_cover: "https://tikwm.com/origin-cover.jpg",
		play: "https://tikwm.com/play.mp4",
		size: 1024,
		wmplay: "https://tikwm.com/wm.mp4",
		wm_size: 2048,
		music_info: {
			id: "6000000000000000001",
			title: "A song",
			play: "https://tikwm.com/music.mp3",
			cover: "https://tikwm.com/music.jpg",
			author: "Author",
			original: true,
			duration: 12,
		},
		statistics: {
			play_count: 10,
			digg_count: 20,
			comment_count: 30,
			share_count: 40,
			download_count: 50,
			collect_count: 60,
		},
	},
};

describe("features/tiktok getContent", () => {
	let server: TestServer;

	beforeAll(async () => {
		server = await startServer((_req, res) => {
			res.writeHead(200, { "Content-Type": "application/json" }).end(
				JSON.stringify(UPSTREAM_PAYLOAD)
			);
		});

		// The client reads its endpoint from the environment when it is
		// imported, so the environment has to be in place first.
		// eslint-disable-next-line turbo/no-undeclared-env-vars
		process.env.TIKTOK_TIKWM_BASE_URL = server.baseURL;
		// eslint-disable-next-line turbo/no-undeclared-env-vars
		process.env.TIKTOK_TIKWM_APIKEY = "test-key";
	});

	afterAll(async () => {
		await server.close();
	});

	it("sends the request the upstream expects and maps the payload", async () => {
		const { getContent } = await import("../src/tiktok/get-content");

		const result = await getContent({
			url: "https://www.tiktok.com/@user/video/123456789",
		});

		const request = server.requests[0];

		expect(request?.method).toBe("GET");
		expect(request?.url).toContain(
			"url=https:%2F%2Fwww.tiktok.com%2F%40user%2Fvideo%2F123456789"
		);
		expect(request?.headers["api-key"]).toBe("test-key");

		expect(result.aweme_id).toBe("7312345678901234567");
		expect(result.author.unique_id).toBe("creator");
		expect(result.media_list.cover.thumbnail).toBe(
			"https://tikwm.com/cover.jpg"
		);
		expect(result.media_list.music.is_original).toBe(true);
		expect(result.statistic.play_count).toBe(10);
		expect(result.statistic.collect_count).toBe(60);
	});

	it("raises the shared failure when the upstream drifts", async () => {
		const { getContent } = await import("../src/tiktok/get-content");

		await expect(
			getContent({ url: "https://www.tiktok.com/@user/video/1" })
		).resolves.toBeDefined();

		const drift = await startServer((_req, res) => {
			res.writeHead(200, { "Content-Type": "application/json" }).end(
				JSON.stringify({ code: 0, msg: "ok", result: {} })
			);
		});

		try {
			// eslint-disable-next-line turbo/no-undeclared-env-vars
			process.env.TIKTOK_TIKWM_BASE_URL = drift.baseURL;
			// eslint-disable-next-line turbo/no-undeclared-env-vars
			process.env.TIKTOK_TIKWM_APIKEY = "test-key";
			jest.resetModules();
			const { getContent: drifted } =
				await import("../src/tiktok/get-content");

			await expect(
				drifted({ url: "https://www.tiktok.com/@user/video/1" })
			).rejects.toThrow("did not match the published schema");
		} finally {
			await drift.close();
		}
	});
});
