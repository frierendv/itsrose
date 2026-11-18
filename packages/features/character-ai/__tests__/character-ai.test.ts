import { ThirdPartyApiError } from "@itsrose/system";
import { vi, type Mock } from "vitest";
import {
	characterInfo,
	characterInfoSchema,
	searchCharacter,
	searchCharacterSchema,
	sendMessage,
	sendMessageSchema,
} from "../src/character-ai";
import { client } from "../src/client";

vi.mock("../src/client", () => {
	return {
		client: {
			character: {
				info: vi.fn(),
				search: vi.fn(),
			},
			chat: {
				sendMessage: vi.fn(),
				clearHistory: vi.fn(),
			},
		},
	};
});

describe("character-ai entry module", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("searchCharacter", () => {
		it("should delegate search request to client.character.search", async () => {
			const mockResponse = {
				characters: [
					{
						external_id: "char-1",
						title: "Anime Girl",
						greeting: "Konnichiwa",
					},
				],
			};

			(client.character.search as Mock).mockResolvedValueOnce(
				mockResponse
			);

			const result = await searchCharacter({ query: "Anime" });

			expect(client.character.search).toHaveBeenCalledWith({
				query: "Anime",
			});
			expect(result).toEqual(mockResponse);
		});
	});

	describe("characterInfo", () => {
		it("should delegate info request to client.character.info", async () => {
			const mockResponse = {
				external_id: "char-1",
				title: "Anime Girl",
				greeting: "Konnichiwa",
			};

			(client.character.info as Mock).mockResolvedValueOnce(mockResponse);

			const result = await characterInfo({ external_id: "char-1" });

			expect(client.character.info).toHaveBeenCalledWith({
				external_id: "char-1",
			});
			expect(result).toEqual(mockResponse);
		});

		it("should throw ThirdPartyApiError if client.character.info returns null", async () => {
			(client.character.info as Mock).mockResolvedValueOnce(null);

			await expect(
				characterInfo({ external_id: "char-1" })
			).rejects.toThrow(ThirdPartyApiError);
		});
	});

	describe("sendMessage", () => {
		it("should send message and clear history by default (should_ressurect falsy)", async () => {
			const mockSendMessageResponse = {
				chat_id: "chat-12345",
				candidates: [
					{ candidate_id: "cand-1", raw_content: "Hello back!" },
				],
			};

			(client.chat.sendMessage as Mock).mockResolvedValueOnce(
				mockSendMessageResponse
			);

			const result = await sendMessage({
				external_id: "char-1",
				message: "Hello",
			});

			expect(client.chat.sendMessage).toHaveBeenCalledWith({
				external_id: "char-1",
				message: "Hello",
			});
			expect(client.chat.clearHistory).toHaveBeenCalledWith({
				chat_id: "chat-12345",
			});
			expect(result).toEqual(mockSendMessageResponse);
		});

		it("should skip clearHistory when should_ressurect is true", async () => {
			const mockSendMessageResponse = {
				chat_id: "chat-12345",
				candidates: [
					{ candidate_id: "cand-1", raw_content: "Hello back!" },
				],
			};

			(client.chat.sendMessage as Mock).mockResolvedValueOnce(
				mockSendMessageResponse
			);

			await sendMessage({
				external_id: "char-1",
				message: "Hello",
				should_ressurect: true,
			});

			expect(client.chat.clearHistory).not.toHaveBeenCalled();
		});

		it("should throw ThirdPartyApiError if client.chat.sendMessage returns null", async () => {
			(client.chat.sendMessage as Mock).mockResolvedValueOnce(null);

			await expect(
				sendMessage({
					external_id: "char-1",
					message: "Hello",
				})
			).rejects.toThrow(ThirdPartyApiError);
		});
	});

	describe("schemas", () => {
		it("should export valid searchCharacterSchema", () => {
			expect(searchCharacterSchema.request).toBeDefined();
			expect(searchCharacterSchema.response).toBeDefined();

			const validRequest = { query: "search text" };
			const parseResult =
				searchCharacterSchema.request.safeParse(validRequest);
			expect(parseResult.success).toBe(true);
		});

		it("should export valid characterInfoSchema", () => {
			expect(characterInfoSchema.request).toBeDefined();
			expect(characterInfoSchema.response).toBeDefined();

			const validRequest = { external_id: "char-1" };
			const parseResult =
				characterInfoSchema.request.safeParse(validRequest);
			expect(parseResult.success).toBe(true);
		});

		it("should export valid sendMessageSchema", () => {
			expect(sendMessageSchema.request).toBeDefined();
			expect(sendMessageSchema.response).toBeDefined();

			const validRequest = {
				external_id: "char-1",
				message: "Test message",
			};
			const parseResult =
				sendMessageSchema.request.safeParse(validRequest);
			expect(parseResult.success).toBe(true);
		});
	});
});
