import { Chat } from "../src/chat/chat";
import { ChatSocket } from "../src/chat/chat-socket";
import type { Client } from "../src/client/client";

jest.mock("../src/chat/chat-socket");

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
	let mockHttpSend: jest.Mock;
	let mockUserGet: jest.Mock;
	let mockUser: MockUser;

	beforeEach(() => {
		jest.clearAllMocks();

		mockHttpSend = jest.fn();
		mockUserGet = jest.fn().mockResolvedValue({
			user: { id: "123", account: { name: "Test" } },
		});

		mockUser = {
			detail: { user: { id: 123, account: { name: "Test" } } },
			get: mockUserGet,
		};

		// Invariant: `Chat` only touches `client.http.send` and `client.user`;
		// the real `Client` also owns a private token field, so the double
		// cannot be expressed as a structural `Client` type.
		mockClient = {
			http: {
				send: mockHttpSend,
			},
			user: mockUser,
		} as unknown as Client;
	});

	describe("clearHistory", () => {
		it("should return true when the upstream call succeeds", async () => {
			mockHttpSend.mockResolvedValue(undefined);

			const chat = new Chat(mockClient);
			const result = await chat.clearHistory({ chat_id: "chat-123" });

			expect(mockHttpSend).toHaveBeenCalledWith({
				url: "/chat/chat-123/resurrect",
			});
			expect(result).toBe(true);
		});

		it("should return false when the upstream call fails", async () => {
			mockHttpSend.mockRejectedValue(new Error("Failed"));

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
