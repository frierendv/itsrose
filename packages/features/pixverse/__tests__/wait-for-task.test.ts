/* eslint-disable turbo/no-undeclared-env-vars */
import { envelope, json, startServer, type TestServer } from "./support/server";

/**
 * A task result with the given status.
 *
 * @param status The status to report.
 * @returns The task result.
 */
function task(status: number) {
	return {
		id: 1,
		prompt: "a prompt",
		url: "https://media.example.com/v.mp4",
		status,
		create_time: "2026-10-23T04:03:03Z",
		modify_time: "2026-10-23T04:03:22Z",
	};
}

describe("waitForTask", () => {
	let server: TestServer;
	let statuses: number[];
	let waitForTask: (typeof import("../src/task/wait-for-task"))["waitForTask"];
	let PixverseTaskError: (typeof import("../src/task/wait-for-task"))["PixverseTaskError"];

	beforeAll(async () => {
		server = await startServer((_req, res) => {
			const next = statuses.length > 0 ? statuses.shift() : 5;
			json(res, envelope(task(next ?? 5)));
		});

		process.env.PIXVERSE_BASE_URL = server.baseURL;
		process.env.PIXVERSE_API_KEY = "test_key";

		({ waitForTask, PixverseTaskError } =
			await import("../src/task/wait-for-task"));
	});

	afterAll(async () => {
		await server.close();
	});

	beforeEach(() => {
		server.requests.length = 0;
		statuses = [];
	});

	it("resolves once the task completes", async () => {
		statuses = [5, 5, 1];

		const result = await waitForTask(1, { interval_ms: 1 });

		expect(result.status).toBe(1);
		expect(server.requests).toHaveLength(3);
	});

	it("stops polling as soon as the task is terminal", async () => {
		statuses = [5, 1, 5, 5];

		await waitForTask(1, { interval_ms: 1 });

		expect(server.requests).toHaveLength(2);
	});

	it("raises a moderation failure", async () => {
		statuses = [5, 7];

		const failure = waitForTask(1, { interval_ms: 1 });

		await expect(failure).rejects.toThrow(PixverseTaskError);
		await expect(failure).rejects.toMatchObject({
			statusCode: 422,
			message: expect.stringContaining("moderation") as string,
		});
		expect(server.requests).toHaveLength(2);
	});

	it("raises a generation failure", async () => {
		statuses = [8];

		await expect(waitForTask(1, { interval_ms: 1 })).rejects.toMatchObject({
			statusCode: 422,
		});
		expect(server.requests).toHaveLength(1);
	});

	it("gives up once the timeout has passed", async () => {
		statuses = [5, 5, 5, 5, 5];

		await expect(
			waitForTask(1, { interval_ms: 5, timeout_ms: 1 })
		).rejects.toMatchObject({ statusCode: 504 });

		// one query is always made, and the deadline is not exceeded by
		// sleeping past it
		expect(server.requests).toHaveLength(1);
	});

	it("reports every state it saw", async () => {
		statuses = [5, 1];
		const seen: number[] = [];

		await waitForTask(1, {
			interval_ms: 1,
			on_poll: (result) => seen.push(result.status),
		});

		expect(seen).toStrictEqual([5, 1]);
	});

	it("never sends a creation request", async () => {
		statuses = [5, 1];

		await waitForTask(1, { interval_ms: 1 });

		expect(
			server.requests.every((request) => request.method === "GET")
		).toBe(true);
	});
});
