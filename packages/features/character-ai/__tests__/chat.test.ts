import { Chat } from "../src/chat/chat";
import { ChatSocket } from "../src/chat/chat-socket";
import type { Client } from "../src/client/client";

jest.mock("../src/chat/chat-socket");

/**
 * Minimal double for the `http.get` envelope consumed by `Chat.clearHistory`.
 *
 * Invariant: `clearHistory` only awaits `http.get(...).onError(handler)` and
 * reads the `error` field of the resolved envelope, so nothing else is needed.
 */
type MockHttpEnvelope = {
	error?: Error;
	onError: (
		handler: (data: unknown, error: unknown) => unknown
	) => Promise<MockHttpEnvelope>;
};

/**
 * Minimal double for the `Client.user` sub-client.
 *
 * Invariant: `Chat.sendMessage` only checks `user.detail` for truthiness and
 * calls `user.get()` when it is missing.
 */
type MockUser = {
	detail: unknown;
	get: jest.Mock;
};

/**
 * Minimal double for the mocked `ChatSocket` instance.
 *
 * Invariant: `Chat.sendMessage` only drives `create`, `waitForOpen`, `send`
 * and `waitForOutput`, and reads back the accumulated `output`.
 */
type MockChatSocket = {
	create: jest.Mock;
	waitForOpen: jest.Mock;
	send: jest.Mock;
	waitForOutput: jest.Mock;
	output: unknown;
};

describe("Chat", () => {
	let mockClient: Client;
	let mockHttpGet: jest.Mock;
	let mockUserGet: jest.Mock;
	let mockUser: MockUser;

	beforeEach(() => {
		jest.clearAllMocks();

		mockHttpGet = jest.fn();
		mockUserGet = jest.fn().mockResolvedValue({
			user: { id: "123", account: { name: "Test" } },
		});

		mockUser = {
			detail: { user: { id: 123, account: { name: "Test" } } },
			get: mockUserGet,
		};

		// Invariant: `Chat` only touches `client.http.get` and `client.user`;
		// the real `Client` also owns a private token field, so the double
		// cannot be expressed as a structural `Client` type.
		mockClient = {
			http: {
				get: mockHttpGet,
			},
			user: mockUser,
		} as unknown as Client;
	});

	describe("clearHistory", () => {
		it("should return true when HTTP GET request succeeds without error", async () => {
			mockHttpGet.mockImplementation(() => {
				const envelope: MockHttpEnvelope = {
					error: undefined,
					onError: (handler) => {
						handler(undefined, undefined);
						return Promise.resolve(envelope);
					},
				};
				return envelope;
			});

			const chat = new Chat(mockClient);
			const result = await chat.clearHistory({ chat_id: "chat-123" });

			expect(mockHttpGet).toHaveBeenCalledWith(
				"/chat/chat-123/resurrect"
			);
			expect(result).toBe(true);
		});

		it("should return false when HTTP GET request has error", async () => {
			mockHttpGet.mockImplementation(() => {
				const error = new Error("Failed");
				const envelope: MockHttpEnvelope = {
					error,
					onError: (handler) => {
						handler(undefined, error);
						return Promise.resolve(envelope);
					},
				};
				return envelope;
			});

			const chat = new Chat(mockClient);
			const result = await chat.clearHistory({ chat_id: "chat-123" });

			expect(result).toBe(false);
		});
	});

	describe("sendMessage", () => {
		it("should fetch user details if detail is not cached", async () => {
			mockUser.detail = undefined;

			const mockSocketInstance: MockChatSocket = {
				create: jest.fn(),
				waitForOpen: jest.fn().mockResolvedValue(undefined),
				send: jest.fn().mockResolvedValue(undefined),
				waitForOutput: jest.fn().mockImplementation(async () => {
					mockSocketInstance.output = {
						chat_id: "chat-999",
						candidates: [
							{ candidate_id: "cand-1", raw_content: "Response" },
						],
						generation_mode: {},
						context_stats: {},
					};
				}),
				output: null,
			};

			(ChatSocket as jest.Mock).mockImplementation(
				() => mockSocketInstance
			);

			const chat = new Chat(mockClient);
			const result = await chat.sendMessage({
				external_id: "char-123",
				message: "Hello",
			});

			expect(mockUserGet).toHaveBeenCalledTimes(1);
			expect(mockSocketInstance.create).toHaveBeenCalledTimes(1);
			expect(mockSocketInstance.waitForOpen).toHaveBeenCalledTimes(1);
			expect(mockSocketInstance.send).toHaveBeenCalledTimes(2);
			expect(mockSocketInstance.waitForOutput).toHaveBeenCalledTimes(1);
			expect(result).toEqual({
				chat_id: "chat-999",
				candidates: [
					{ candidate_id: "cand-1", raw_content: "Response" },
				],
				generation_mode: {},
				context_stats: {},
			});
		});
	});
});
