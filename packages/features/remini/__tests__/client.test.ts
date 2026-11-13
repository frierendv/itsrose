import {
	HttpPromise,
	type HttpClientError,
	type HttpResponse,
} from "@itsrose/http-client";
import { Client } from "../src/client/client";
import { TaskSocket } from "../src/client/task-socket";
import type { CurrentUserAccount } from "../src/types";

// eslint-disable-next-line turbo/no-undeclared-env-vars
process.env.REMINI_API_BASE_URL = "https://remini.example.com";
// eslint-disable-next-line turbo/no-undeclared-env-vars
process.env.REMINI_WSS_BASE_URL = "wss://remini.example.com";

/**
 * Builds a resolved HTTP response envelope.
 *
 * Invariant: the code under test only reads `data`, `error` and `status` from
 * the envelope; the axios-only `headers`/`config` fields are never inspected
 * by these tests, so empty placeholders are safe here.
 */
const mockResponse = (
	partial: Partial<HttpResponse<unknown, HttpClientError>>
): HttpResponse<unknown, HttpClientError> =>
	({
		ok: true,
		headers: {},
		config: {},
		...partial,
	}) as unknown as HttpResponse<unknown, HttpClientError>;

/**
 * Builds a resolved `HttpPromise` double for `jest.spyOn(...).mockImplementation`.
 */
const mockBuilder = (data: unknown): HttpPromise<unknown, HttpClientError> =>
	new HttpPromise<unknown, HttpClientError>(() =>
		Promise.resolve(mockResponse({ data }))
	);

/**
 * Reads a private field of the object under test.
 *
 * TypeScript's `private` modifier is erased at runtime, so reflecting on the
 * instance is equivalent to the previous untyped private-field access
 * while keeping the read value `unknown`-typed.
 */
const readPrivate = (target: object, key: string): unknown => {
	const value: unknown = Reflect.get(target, key);
	return value;
};

/**
 * Writes a private field of the object under test (same rationale as
 * {@linkcode readPrivate}).
 */
const writePrivate = (target: object, key: string, value: unknown): void => {
	Reflect.set(target, key, value);
};

/**
 * Invokes a private method of the object under test (same rationale as
 * {@linkcode readPrivate}).
 */
const invokePrivate = (
	target: object,
	method: string,
	...args: unknown[]
): unknown => {
	const fn: unknown = Reflect.get(target, method);
	if (typeof fn !== "function") {
		throw new Error(`Expected "${method}" to be a function.`);
	}
	return Reflect.apply(fn, target, args);
};

/**
 * Narrows an `unknown` value to a plain object.
 */
const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null;

/**
 * Valid `CurrentUserAccount` fixture used whenever the account payload is
 * irrelevant for the assertion under test.
 */
const userAccountFixture: CurrentUserAccount = {
	image_training_consent: false,
	image_training_consent_version: null,
	balance: 0,
	next_renew_balance_seconds: 0,
};

describe("Remini Client Workflow", () => {
	let client: Client;

	beforeEach(() => {
		client = new Client();
	});

	describe("Initialization & Deduplication", () => {
		it("deduplicates concurrent ensureInitialized calls", async () => {
			let setupCalls = 0;
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			let challengeCalls = 0;

			jest.spyOn(client, "get").mockImplementation((url: string) => {
				if (url === "/v1/mobile/oracle/setup") {
					setupCalls++;
					return mockBuilder({
						me: { unique_id: "u123", authentication: {} },
						settings: {
							__identity__: {
								token: "tok123",
								expiration: "2030-01-01T00:00:00Z",
							},
						},
					});
				}
				return mockBuilder({});
			});

			jest.spyOn(client, "post").mockImplementation((url: string) => {
				if (url === "/api/public/v1/challenges") {
					challengeCalls++;
					return mockBuilder({ challenge: "ch123" });
				}
				if (url === "/api/public/v1/users/android/access-token") {
					return mockBuilder({ access_token: "iris_acc_token" });
				}
				return mockBuilder({});
			});

			// Call ensureInitialized 3 times concurrently
			await Promise.all([
				client.ensureInitialized(),
				client.ensureInitialized(),
				client.ensureInitialized(),
			]);

			expect(setupCalls).toBe(1);
			expect(client.oracle.initialized).toBe(true);
			expect(client.oracle.getHeaders()["Iris-Access-Token"]).toBe(
				"tok123"
			);
		});

		it("deduplicates concurrent user.getMe calls", async () => {
			jest.spyOn(client, "ensureInitialized").mockResolvedValue(
				undefined
			);

			let getMeCalls = 0;
			jest.spyOn(client, "get").mockImplementation((url: string) => {
				if (url === "/v1/mobile/users/@me") {
					getMeCalls++;
					return mockBuilder({ id: "user_1", name: "Test User" });
				}
				return mockBuilder({});
			});

			const [res1, res2, res3] = await Promise.all([
				client.user.getMe(),
				client.user.getMe(),
				client.user.getMe(),
			]);

			expect(getMeCalls).toBe(1);
			expect(res1).toEqual({ id: "user_1", name: "Test User" });
			expect(res2).toBe(res1);
			expect(res3).toBe(res1);
		});
	});

	describe("TaskSocket Error Handling", () => {
		it("rejects immediately when socket encounters an error before waitForOutput", async () => {
			const taskSocket = new TaskSocket(client);
			const error = new Error("Connection failed");

			// Simulate socket error before waitForOutput is awaited
			invokePrivate(taskSocket, "onError", error);

			await expect(taskSocket.waitForOutput()).rejects.toThrow(
				"Connection failed"
			);
		});

		it("resolves when completed message arrives before waitForOutput", async () => {
			const taskSocket = new TaskSocket(client);
			const response = { status: "completed", result: { outputs: [] } };

			invokePrivate(
				taskSocket,
				"onMessage",
				Buffer.from(JSON.stringify(response))
			);

			await expect(taskSocket.waitForOutput()).resolves.toBeUndefined();
			expect(taskSocket.output).toEqual(response);
		});

		it("ignores processing status messages and waits for completed message", async () => {
			const taskSocket = new TaskSocket(client);
			const processingResponse = {
				status: "processing",
				result: null,
				error: null,
			};
			const completedResponse = {
				status: "completed",
				result: { outputs: [{ url: "http://example.com/res.jpg" }] },
				error: null,
			};

			// Send processing status
			invokePrivate(
				taskSocket,
				"onMessage",
				Buffer.from(JSON.stringify(processingResponse))
			);
			expect(taskSocket.output).toBeNull();

			// Send completed status
			invokePrivate(
				taskSocket,
				"onMessage",
				Buffer.from(JSON.stringify(completedResponse))
			);
			expect(taskSocket.output).toEqual(completedResponse);
		});
	});

	describe("Oracle Token Lifecycle", () => {
		it("correctly identifies unexpired vs expired token", () => {
			expect(client.oracle.isTokenExpired).toBe(true);

			writePrivate(client.oracle, "_currentOracleUser", {
				unique_id: "u123",
				identity: {
					token: "tok",
					expiration: Date.now() + 3600_000, // 1 hour in future
				},
			});
			expect(client.oracle.isTokenExpired).toBe(false);

			const currentUser = readPrivate(
				client.oracle,
				"_currentOracleUser"
			);
			if (!isRecord(currentUser)) {
				throw new Error("Expected the oracle user to be an object.");
			}
			const identity = currentUser.identity;
			if (!isRecord(identity)) {
				throw new Error(
					"Expected the oracle identity to be an object."
				);
			}
			identity.expiration = Date.now() - 1000; // expired
			expect(client.oracle.isTokenExpired).toBe(true);
		});

		it("throws ThirdPartyApiError when oracle setup request fails", async () => {
			jest.spyOn(client, "get").mockResolvedValue(
				mockResponse({ data: null })
			);
			await expect(client.oracle.initialize()).rejects.toThrow(
				"Failed to initialize remini."
			);
		});

		it("refreshes oracle token without calling terms of service repeatedly", async () => {
			let setupCalls = 0;
			let postCalls = 0;

			jest.spyOn(client, "get").mockImplementation((url: string) => {
				if (url === "/v1/mobile/oracle/setup") {
					setupCalls++;
					return mockBuilder({
						me: { unique_id: "u123", authentication: {} },
						settings: {
							__identity__: {
								token: "refreshed_tok",
								expiration: "2030-01-01T00:00:00Z",
							},
						},
					});
				}
				return mockBuilder({});
			});

			jest.spyOn(client, "post").mockImplementation(() => {
				postCalls++;
				return mockBuilder({});
			});

			await client.oracle.initialize(true);
			expect(postCalls).toBe(2); // tos + privacy

			await client.oracle.refresh();
			expect(setupCalls).toBe(2);
			expect(client.oracle.getHeaders()["Identity-Token"]).toBe(
				"refreshed_tok"
			);
		});

		it("deduplicates concurrent initialize calls when initPromise is pending", async () => {
			let setupCalls = 0;
			jest.spyOn(client, "get").mockImplementation((url: string) => {
				if (url === "/v1/mobile/oracle/setup") {
					setupCalls++;
					return mockBuilder({
						me: { unique_id: "u123", authentication: {} },
						settings: {
							__identity__: {
								token: "tok123",
								expiration: "2030-01-01T00:00:00Z",
							},
						},
					});
				}
				return mockBuilder({});
			});
			jest.spyOn(client, "post").mockReturnValue(mockBuilder({}));

			await Promise.all([
				client.oracle.initialize(),
				client.oracle.initialize(),
			]);
			expect(setupCalls).toBe(1);

			// Calling initialize when already initialized returns immediately
			await client.oracle.initialize();
			expect(setupCalls).toBe(1);
		});

		it("refreshes token via ensureValidToken when initialized but token is expired", async () => {
			let refreshCalls = 0;
			writePrivate(client.oracle, "_oracleInitialized", true);
			jest.spyOn(client.oracle, "isTokenExpired", "get").mockReturnValue(
				true
			);
			jest.spyOn(client.oracle, "refresh").mockImplementation(
				async () => {
					refreshCalls++;
				}
			);

			await client.oracle.ensureValidToken();
			expect(refreshCalls).toBe(1);
		});

		it("returns cached headers when cached headers exist", () => {
			writePrivate(client.oracle, "_cachedHeaders", {
				"Custom-Header": "abc",
			});
			expect(client.oracle.getHeaders()).toEqual({
				"Custom-Header": "abc",
			});
		});

		it("returns empty string token headers when currentOracleUser is undefined", () => {
			writePrivate(client.oracle, "_cachedHeaders", undefined);
			writePrivate(client.oracle, "_currentOracleUser", undefined);
			expect(client.oracle.getHeaders()["Identity-Token"]).toBe("");
		});
	});

	describe("Client Ping & User Account Caching", () => {
		it("pings remini server", async () => {
			jest.spyOn(client, "get").mockResolvedValue(
				mockResponse({ data: "pong" })
			);
			const result = await client.ping();
			expect(result).toBe("pong");
		});

		it("returns cached account on user.getMe if already fetched", async () => {
			const cachedAccount: CurrentUserAccount = {
				...userAccountFixture,
				balance: 100,
			};
			client.user.account = cachedAccount;
			const res = await client.user.getMe();
			expect(res).toBe(cachedAccount);
		});
	});

	describe("Iris Helper", () => {
		it("returns device metadata and fallback tokens", async () => {
			expect(client.iris.getDeviceMetadata().board).toBeDefined();
			expect(await client.iris.getAccessToken()).toBe("");

			writePrivate(client.oracle, "_currentOracleUser", {
				identity: { token: "iris_tok_123" },
			});

			expect(await client.iris.getAccessToken()).toBe("iris_tok_123");
			// Cached check
			expect(await client.iris.getAccessToken()).toBe("iris_tok_123");
		});
	});

	describe("Task & TaskSocket Edge Cases", () => {
		it("rejects waitForOutput if task was not submitted", async () => {
			const taskSocket = new TaskSocket(client);
			await expect(taskSocket.waitForOutput()).rejects.toThrow(
				"Task has not been submitted."
			);
		});

		it("handles unexpected socket close event", async () => {
			writePrivate(client.oracle, "_currentOracleUser", {
				identity: { token: "valid_tok" },
			});
			const taskSocket = new TaskSocket(client);
			taskSocket.submit("task_123");
			const waitPromise = taskSocket.waitForOutput();
			invokePrivate(taskSocket, "onClose");
			await expect(waitPromise).rejects.toThrow(
				"Task connection closed unexpectedly."
			);
		});

		it("finishes cleanly without error when resolveWait is undefined", () => {
			writePrivate(client.oracle, "_currentOracleUser", {
				identity: { token: "valid_tok" },
			});
			const taskSocket = new TaskSocket(client);
			taskSocket.submit("task_123");
			invokePrivate(taskSocket, "finish");
			expect(taskSocket.error).toBeNull();
		});

		it("calls resolveWait on finish when resolveWait is defined", async () => {
			writePrivate(client.oracle, "_currentOracleUser", {
				identity: { token: "valid_tok" },
			});
			const taskSocket = new TaskSocket(client);
			taskSocket.submit("task_123");
			const promise = taskSocket.waitForOutput();
			invokePrivate(taskSocket, "finish");
			await expect(promise).resolves.toBeUndefined();
		});

		it("finishes cleanly with error when rejectWait is undefined", () => {
			writePrivate(client.oracle, "_currentOracleUser", {
				identity: { token: "valid_tok" },
			});
			const taskSocket = new TaskSocket(client);
			taskSocket.submit("task_123");
			invokePrivate(taskSocket, "finish", new Error("silent error"));
			expect(taskSocket.error).toBeDefined();
		});

		it("ignores non-json message payload", () => {
			writePrivate(client.oracle, "_currentOracleUser", {
				identity: { token: "valid_tok" },
			});
			const taskSocket = new TaskSocket(client);
			taskSocket.submit("task_123");
			invokePrivate(
				taskSocket,
				"onMessage",
				Buffer.from("invalid json payload")
			);
			expect(taskSocket.output).toBeNull();
		});

		it("times out during waitForOutput", async () => {
			jest.useFakeTimers();
			writePrivate(client.oracle, "_currentOracleUser", {
				identity: { token: "valid_tok" },
			});
			const taskSocket = new TaskSocket(client);
			taskSocket.submit("task_123");
			const waitPromise = taskSocket.waitForOutput();
			jest.advanceTimersByTime(30_000);
			await expect(waitPromise).rejects.toThrow("Task timed out.");
			jest.useRealTimers();
		});

		it("invokes cleanup and clears active timeout when submitting a new task on an existing TaskSocket", () => {
			writePrivate(client.oracle, "_currentOracleUser", {
				identity: { token: "valid_tok" },
			});
			const taskSocket = new TaskSocket(client);
			taskSocket.submit("task_1");
			taskSocket.waitForOutput().catch(() => {});
			taskSocket.submit("task_2");
			expect(readPrivate(taskSocket, "socket")).toBeDefined();
		});

		it("throws InvalidRequestError for unsupported image buffer", async () => {
			const invalidBuffer = Buffer.from("not-an-image-buffer");
			await expect(client.task.create(invalidBuffer, [])).rejects.toThrow(
				"image is not supported."
			);
		});

		it("throws ThirdPartyApiError if task creation response is missing task_id or upload_url", async () => {
			const base64Png =
				"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
			const validBuffer = Buffer.from(base64Png, "base64");

			jest.spyOn(client.oracle, "ensureValidToken").mockResolvedValue(
				undefined
			);
			jest.spyOn(client.user, "getMe").mockResolvedValue(
				userAccountFixture
			);
			jest.spyOn(client, "post").mockResolvedValue(
				mockResponse({ data: null })
			);

			await expect(client.task.create(validBuffer, [])).rejects.toThrow(
				"Failed to create task."
			);
		});

		it("throws ThirdPartyApiError if image upload status is not 200", async () => {
			const base64Png =
				"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
			const validBuffer = Buffer.from(base64Png, "base64");

			jest.spyOn(client.oracle, "ensureValidToken").mockResolvedValue(
				undefined
			);
			jest.spyOn(client.user, "getMe").mockResolvedValue(
				userAccountFixture
			);
			jest.spyOn(client, "post").mockResolvedValue(
				mockResponse({
					data: { task_id: "t1", upload_url: "http://up.com" },
				})
			);
			jest.spyOn(client, "put").mockResolvedValue(
				mockResponse({ status: 500 })
			);

			await expect(client.task.create(validBuffer, [])).rejects.toThrow(
				"Image upload error."
			);
		});

		it("throws ThirdPartyApiError when socket processing completes without output", async () => {
			const base64Png =
				"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
			const validBuffer = Buffer.from(base64Png, "base64");

			jest.spyOn(client.oracle, "ensureValidToken").mockResolvedValue(
				undefined
			);
			jest.spyOn(client.user, "getMe").mockResolvedValue(
				userAccountFixture
			);
			jest.spyOn(client, "post").mockResolvedValue(
				mockResponse({
					data: { task_id: "t1", upload_url: "http://up.com" },
				})
			);
			jest.spyOn(client, "put").mockResolvedValue(
				mockResponse({ status: 200 })
			);

			jest.spyOn(TaskSocket.prototype, "submit").mockImplementation(
				function (this: TaskSocket) {
					this.output = null;
				}
			);
			jest.spyOn(TaskSocket.prototype, "waitForOutput").mockResolvedValue(
				undefined
			);

			await expect(client.task.create(validBuffer, [])).rejects.toThrow(
				"Processing failed. Please try again."
			);
		});

		it("retries task execution once on 401 unauthorized error", async () => {
			const base64Png =
				"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
			const validBuffer = Buffer.from(base64Png, "base64");

			let attempts = 0;
			jest.spyOn(client.oracle, "ensureValidToken").mockResolvedValue(
				undefined
			);
			jest.spyOn(client.oracle, "refresh").mockResolvedValue(undefined);
			jest.spyOn(client.user, "getMe").mockResolvedValue(
				userAccountFixture
			);

			jest.spyOn(client, "post").mockImplementation((url: string) => {
				if (url === "/v1/mobile/tasks") {
					attempts++;
					if (attempts === 1) {
						const err: Error & { status?: number } = new Error(
							"Unauthorized"
						);
						err.status = 401;
						throw err;
					}
					return mockBuilder({
						task_id: "t1",
						upload_url: "http://up.com",
					});
				}
				return mockBuilder({});
			});

			jest.spyOn(client, "put").mockResolvedValue(
				mockResponse({ status: 200 })
			);

			jest.spyOn(TaskSocket.prototype, "submit").mockImplementation(
				function (this: TaskSocket) {
					this.output = {
						status: "completed",
						result: {
							input_url: "http://in.com",
							expire_at: "2030",
							outputs: [{ url: "http://out.com" }],
						},
						error: null,
					};
				}
			);
			jest.spyOn(TaskSocket.prototype, "waitForOutput").mockResolvedValue(
				undefined
			);

			const res = await client.task.create(validBuffer, [
				{ face_enhance: { model: "remini", pre_blur: 0.6 } },
			]);
			expect(res.status).toBe("completed");
			expect(attempts).toBe(2);
		});
	});
});
