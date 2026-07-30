import { Chat } from "../src/chat/chat";
import { ChatSocket } from "../src/chat/chat-socket";
import type { Client } from "../src/client/client";

jest.mock("../src/chat/chat-socket");

describe("Chat", () => {
	let mockClient: Client;
	let mockHttpGet: jest.Mock;
	let mockUserGet: jest.Mock;

	beforeEach(() => {
		jest.clearAllMocks();

		mockHttpGet = jest.fn();
		mockUserGet = jest.fn().mockResolvedValue({
			user: { id: "123", account: { name: "Test" } },
		});

		mockClient = {
			http: {
				get: mockHttpGet,
			},
			user: {
				detail: {
					user: { id: 123, account: { name: "Test" } },
				},
				get: mockUserGet,
			},
		} as unknown as Client;
	});

	describe("clearHistory", () => {
		it("should return true when HTTP GET request succeeds without error", async () => {
			mockHttpGet.mockImplementation(() => {
				const promise = Promise.resolve({ error: undefined }) as any;
				promise.onError = jest
					.fn()
					.mockImplementation((_fn: any) => promise);
				return promise;
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
				const promise = Promise.resolve({
					error: new Error("Failed"),
				}) as any;
				promise.onError = jest.fn().mockImplementation((fn: any) => {
					fn();
					return Promise.resolve({ error: new Error("Failed") });
				});
				return promise;
			});

			const chat = new Chat(mockClient);
			const result = await chat.clearHistory({ chat_id: "chat-123" });

			expect(result).toBe(false);
		});
	});

	describe("sendMessage", () => {
		it("should fetch user details if detail is not cached", async () => {
			(mockClient.user as any).detail = undefined;

			const mockSocketInstance = {
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
					} as any;
				}),
				output: null as any,
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
