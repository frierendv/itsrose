import { Character } from "../src/client/character";
import type { Client } from "../src/client/client";

describe("Character", () => {
	let mockClient: Client;
	let mockHttpPost: jest.Mock;
	let mockHttpGet: jest.Mock;

	beforeEach(() => {
		mockHttpPost = jest.fn();
		mockHttpGet = jest.fn();
		mockClient = {
			http: {
				post: mockHttpPost,
				get: mockHttpGet,
			},
		} as unknown as Client;
	});

	it("should get character info via POST request and parse response", async () => {
		const rawCharacter = {
			external_id: "char-abc",
			title: "Character Title",
			avatar_file_name: "avatar.png",
			user_id: "user-1",
			user__username: "creator",
			participant__name: "Creator Name",
			num_likes: 10,
			num_chats: 20,
			participant__num_interactions: 30,
		};

		mockHttpPost.mockResolvedValueOnce({
			data: { character: rawCharacter },
		});

		const character = new Character(mockClient);
		const result = await character.info({ external_id: "char-abc" });

		expect(mockHttpPost).toHaveBeenCalledWith(
			"/character/v1/get_character_info",
			{ external_id: "char-abc" }
		);
		expect(result.external_id).toBe("char-abc");
		expect(result.avatar_url).toBe(
			"https://characterai.io/i/400/static/avatars/avatar.png"
		);
	});

	it("should search characters via GET request and parse list of characters", async () => {
		const rawCharacters = [
			{
				external_id: "char-1",
				title: "Char 1",
				avatar_file_name: "1.png",
			},
			{
				external_id: "char-2",
				title: "Char 2",
				avatar_file_name: "2.png",
			},
		];

		mockHttpGet.mockResolvedValueOnce({
			data: { characters: rawCharacters },
		});

		const character = new Character(mockClient);
		const result = await character.search({ query: "Anime" });

		expect(mockHttpGet).toHaveBeenCalledWith("/search/v1/character", {
			params: {
				sortedBy: "relevance",
				query: "Anime",
			},
		});
		expect(result.characters).toHaveLength(2);
		expect(result.characters[0]?.external_id).toBe("char-1");
		expect(result.characters[1]?.external_id).toBe("char-2");
	});
});
