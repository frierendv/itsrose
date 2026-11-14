import { Character } from "../src/client/character";
import type { Client } from "../src/client/client";

/**
 * A character body as the upstream sends it, with every field the published
 * schema requires.
 */
const RAW_CHARACTER = {
	external_id: "char-abc",
	title: "Character Title",
	description: "A character",
	greeting: "Hello!",
	primary_language: "OTHER",
	is_licensed_professional: false,
	avatar_file_name: "avatar.png",
	user_id: "user-1",
	user__username: "creator",
	participant__name: "Creator Name",
	num_likes: 10,
	num_chats: 20,
	participant__num_interactions: 30,
};

describe("Character", () => {
	let mockClient: Client;
	let mockHttpSend: jest.Mock;

	beforeEach(() => {
		mockHttpSend = jest.fn();
		mockClient = {
			http: {
				send: mockHttpSend,
			},
		} as unknown as Client;
	});

	it("should get character info via POST request and parse response", async () => {
		mockHttpSend.mockResolvedValueOnce({
			character: RAW_CHARACTER,
		});

		const character = new Character(mockClient);
		const result = await character.info({ external_id: "char-abc" });

		expect(mockHttpSend).toHaveBeenCalledWith({
			url: "/character/v1/get_character_info",
			method: "post",
			data: { external_id: "char-abc" },
		});
		expect(result.external_id).toBe("char-abc");
		expect(result.avatar_url).toBe(
			"https://characterai.io/i/400/static/avatars/avatar.png"
		);
	});

	it("should search characters via GET request and parse list of characters", async () => {
		const rawCharacters = [
			{ ...RAW_CHARACTER, external_id: "char-1", title: "Char 1" },
			{
				...RAW_CHARACTER,
				external_id: "char-2",
				title: "Char 2",
				avatar_file_name: "2.png",
			},
		];

		mockHttpSend.mockResolvedValueOnce({
			characters: rawCharacters,
		});

		const character = new Character(mockClient);
		const result = await character.search({ query: "Anime" });

		expect(mockHttpSend).toHaveBeenCalledWith({
			url: "/search/v1/character",
			params: {
				sortedBy: "relevance",
				query: "Anime",
			},
		});
		expect(result.characters).toHaveLength(2);
		expect(result.characters[0]?.external_id).toBe("char-1");
		expect(result.characters[1]?.external_id).toBe("char-2");
	});

	it("rejects a character the upstream drifted on", async () => {
		mockHttpSend.mockResolvedValueOnce({
			character: { ...RAW_CHARACTER, title: undefined },
		});

		const character = new Character(mockClient);

		await expect(
			character.info({ external_id: "char-abc" })
		).rejects.toThrow("did not match the published schema");
	});
});
