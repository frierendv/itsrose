import { vi, type Mock } from "vitest";
import { Chat } from "../src/chat/chat";
import { ChatSocket } from "../src/chat/chat-socket";
import type { Client } from "../src/client/client";

vi.mock("../src/chat/chat-socket");

/**
 * Minimal double for the `Client.user` sub-client.
 *
 * Invariant: `Chat.sendMessage` only checks `user.detail` for truthiness and
 * calls `user.get()` when it is missing.
 */
type MockUser = {
	detail: unknown;
	get: Mock;
};

/**
 * Minimal double for the mocked `ChatSocket` instance.
 *
 * Invariant: `Chat.sendMessage` only drives `create`, `waitForOpen`, `send`
 * and `waitForOutput`, and reads back the accumulated `output`.
 */
type MockChatSocket = {
	create: Mock;
	waitForOpen: Mock;
	send: Mock;
	waitForOutput: Mock;
	output: unknown;
};

describe("Chat", () => {
	let mockClient: Client;
	let mockHttpSend: Mock;
	let mockUserGet: Mock;
	let mockUser: MockUser;

	beforeEach(() => {
		vi.clearAllMocks();

		mockHttpSend = vi.fn();
		mockUserGet = vi.fn().mockResolvedValue({
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
				create: vi.fn(),
				waitForOpen: vi.fn().mockResolvedValue(undefined),
				send: vi.fn().mockResolvedValue(undefined),
				waitForOutput: vi.fn().mockImplementation(async () => {
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

			// Vitest constructs the mock with `Reflect.construct`, so the
			// implementation has to be a `function` - an arrow function
			// cannot be constructed.
			(ChatSocket as Mock).mockImplementation(function () {
				return mockSocketInstance;
			});

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
