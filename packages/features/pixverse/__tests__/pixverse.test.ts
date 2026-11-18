/* eslint-disable turbo/no-undeclared-env-vars */
import {
	PIXVERSE_ERROR_MAP,
	readErrorCode,
	readErrorMessage,
} from "../src/client/errors";
import {
	isTerminalTaskStatus,
	PIXVERSE_TASK_STATUS,
	PixverseSyncState,
	toSyncState,
} from "../src/constants/task-status";
import { PIXVERSE_ENV, PIXVERSE_ENV_KEYS } from "../src/env";

describe("features/pixverse", () => {
	beforeAll(() => {
		process.env.PIXVERSE_BASE_URL = "https://app-api.pixverse.ai";
		process.env.PIXVERSE_API_KEY = "test_key";
	});

	describe("environment", () => {
		it("publishes the keys it reads", () => {
			expect(PIXVERSE_ENV_KEYS).toStrictEqual([
				PIXVERSE_ENV.baseUrl,
				PIXVERSE_ENV.apiKey,
			]);
			expect(PIXVERSE_ENV.apiKey).toBe("PIXVERSE_API_KEY");
		});

		it("loads the configuration", async () => {
			const { PIXVERSE_API_KEY, PIXVERSE_BASE_URL } =
				await import("../src/config");

			expect(PIXVERSE_BASE_URL).toBe("https://app-api.pixverse.ai");
			expect(PIXVERSE_API_KEY).toBe("test_key");
		});

		it("defaults the base url to production", async () => {
			delete process.env.PIXVERSE_BASE_URL;

			const { PIXVERSE_BASE_URL, PIXVERSE_PRODUCTION_BASE_URL } =
				await import("../src/config");

			expect(PIXVERSE_BASE_URL).toBe(PIXVERSE_PRODUCTION_BASE_URL);
			expect(PIXVERSE_PRODUCTION_BASE_URL).toBe(
				"https://app-api.pixverse.ai"
			);
		});
	});

	describe("task status", () => {
		it("treats only the documented terminal states as terminal", () => {
			expect(isTerminalTaskStatus(PIXVERSE_TASK_STATUS.completed)).toBe(
				true
			);
			expect(
				isTerminalTaskStatus(PIXVERSE_TASK_STATUS.moderation_failed)
			).toBe(true);
			expect(isTerminalTaskStatus(PIXVERSE_TASK_STATUS.failed)).toBe(
				true
			);
			expect(isTerminalTaskStatus(PIXVERSE_TASK_STATUS.generating)).toBe(
				false
			);
		});

		it("translates every upstream status into the shared vocabulary", () => {
			expect(toSyncState(PIXVERSE_TASK_STATUS.completed)).toBe(
				"completed"
			);
			expect(toSyncState(PIXVERSE_TASK_STATUS.generating)).toBe(
				"in_progress"
			);
			expect(toSyncState(PIXVERSE_TASK_STATUS.moderation_failed)).toBe(
				"failed"
			);
			expect(toSyncState(PIXVERSE_TASK_STATUS.failed)).toBe("failed");
		});

		it("never reports an unknown status as terminal", () => {
			expect(toSyncState(42)).toBe("in_progress");
			expect(isTerminalTaskStatus(42)).toBe(false);
		});

		it("uses the same vocabulary as the rest of the surface", () => {
			expect(Object.values(PixverseSyncState).sort()).toStrictEqual([
				"completed",
				"failed",
				"in_progress",
				"not_started",
			]);
		});
	});

	describe("error mapping", () => {
		it("reads the business code from the envelope", () => {
			expect(readErrorCode({ ErrCode: 500044 })).toBe(500044);
			expect(readErrorCode({ ErrCode: "500044" })).toBeUndefined();
			expect(readErrorCode(null)).toBeUndefined();
		});

		it("prefers the documented detail message", () => {
			expect(
				readErrorMessage({
					ErrMsg: "summary",
					Error: { Message: "the specific cause" },
				})
			).toBe("the specific cause");
			expect(readErrorMessage({ ErrMsg: "summary" })).toBe("summary");
			expect(readErrorMessage({})).toBeUndefined();
		});

		it("maps the documented codes onto the documented statuses", () => {
			expect(PIXVERSE_ERROR_MAP[500044]!.statusCode).toBe(429);
			expect(PIXVERSE_ERROR_MAP[500090]!.statusCode).toBe(402);
			expect(PIXVERSE_ERROR_MAP[500085]!.statusCode).toBe(403);
			expect(PIXVERSE_ERROR_MAP[500008]!.statusCode).toBe(404);
			expect(PIXVERSE_ERROR_MAP[10001]!.statusCode).toBe(401);
		});
	});

	describe("public surface", () => {
		it("exports the operations of the documented core flow", async () => {
			const api = await import("../src/index");

			expect(typeof api.createTextToVideo).toBe("function");
			expect(typeof api.createImageToVideo).toBe("function");
			expect(typeof api.getTask).toBe("function");
			expect(typeof api.waitForTask).toBe("function");
			expect(typeof api.uploadImage).toBe("function");
			expect(typeof api.getAccountBalance).toBe("function");
			expect(typeof api.verifyWebhookSignature).toBe("function");
			expect(typeof api.toSyncState).toBe("function");
			expect(typeof api.toTaskResponse).toBe("function");
		});

		it("publishes a request and response schema per operation", async () => {
			const api = await import("../src/index");

			for (const schema of [
				api.textToVideoSchema,
				api.imageToVideoSchema,
				api.getTaskSchema,
			]) {
				expect(schema.request).toBeDefined();
				expect(schema.response).toBeDefined();
			}
			expect(typeof api.PixverseTaskError).toBe("function");
		});
	});

	describe("api key requirement", () => {
		it("requires the api key", async () => {
			const saved = process.env.PIXVERSE_API_KEY;
			delete process.env.PIXVERSE_API_KEY;
			vi.resetModules();

			try {
				await expect(import("../src/config")).rejects.toThrow(
					/PIXVERSE_API_KEY/
				);
			} finally {
				process.env.PIXVERSE_API_KEY = saved;
			}
		});
	});
});
