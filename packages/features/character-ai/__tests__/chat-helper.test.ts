import { ChatHelper } from "../src/chat/chat-helper";
import type { Client } from "../src/client";

describe("ChatHelper", () => {
	let mockClient: Client;

	beforeEach(() => {
		mockClient = {
			user: {
				detail: {
					user: {
						id: 12345,
						account: {
							name: "TestUser",
						},
					},
				},
			},
		} as unknown as Client;
	});

	describe("createChat", () => {
		it("should create chat payload with provided chatId", () => {
			const helper = new ChatHelper(mockClient);
			const result = helper.createChat("char-ext-1", "chat-id-999");

			expect(result.chat_id).toBe("chat-id-999");
			expect(result.chat.command).toBe("create_chat");
			expect(result.chat.origin_id).toBe("web");
			expect(result.chat.request_id).toBeDefined();
			expect(result.chat.payload).toEqual({
				chat: {
					chat_id: "chat-id-999",
					creator_id: "12345",
					visibility: "VISIBILITY_PRIVATE",
					character_id: "char-ext-1",
					type: "TYPE_ONE_ON_ONE",
				},
				with_greeting: false,
			});
		});

		it("should generate random chatId if not provided", () => {
			const helper = new ChatHelper(mockClient);
			const result = helper.createChat("char-ext-1");

			expect(result.chat_id).toBeDefined();
			expect(typeof result.chat_id).toBe("string");
			expect(result.chat.payload.chat.chat_id).toBe(result.chat_id);
		});
	});

	describe("createChatMessage", () => {
		it("should create chat message payload with turn details", () => {
			const helper = new ChatHelper(mockClient);
			const chatMessage = helper.createChatMessage({
				character_id: "char-ext-1",
				chat_id: "chat-123",
				raw_content: "Hello Character!",
			});

			expect(chatMessage.command).toBe("create_and_generate_turn");
			expect(chatMessage.origin_id).toBe("web");
			expect(chatMessage.payload.character_id).toBe("char-ext-1");
			expect(chatMessage.payload.num_candidates).toBe(1);
			expect(chatMessage.payload.turn.turn_key.chat_id).toBe("chat-123");
			expect(chatMessage.payload.turn.author).toEqual({
				author_id: "12345",
				is_human: true,
				name: "TestUser",
			});
			expect(chatMessage.payload.turn.candidates).toHaveLength(1);
			expect(chatMessage.payload.turn.candidates[0]?.raw_content).toBe(
				"Hello Character!"
			);
		});
	});
});
