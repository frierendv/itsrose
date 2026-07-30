import { parseCharacterInfo } from "../src/utils/parse-character";

describe("parseCharacterInfo", () => {
	it("should parse raw character object and attach avatar_url, creator, and metadata", () => {
		const rawCharacter = {
			external_id: "char-123",
			title: "Test Character",
			avatar_file_name: "avatar.png",
			user_id: "user-456",
			user__username: "creator_user",
			participant__name: "Creator Display Name",
			num_likes: 42,
			num_chats: 100,
			participant__num_interactions: 500,
			greeting: "Hello!",
			description: "A test character",
			is_licensed_professional: false,
		};

		const result = parseCharacterInfo(rawCharacter);

		expect(result.external_id).toBe("char-123");
		expect(result.avatar_url).toBe(
			"https://characterai.io/i/400/static/avatars/avatar.png"
		);
		expect(result.creator).toEqual({
			user_id: "user-456",
			user__username: "creator_user",
			participant__name: "Creator Display Name",
		});
		expect(result.metadata).toEqual({
			num_likes: 42,
			num_chats: 100,
			participant__num_interactions: 500,
		});
	});
});
