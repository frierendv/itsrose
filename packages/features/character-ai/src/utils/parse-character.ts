import type { CharacterInfo } from "../zod-schema";

export function parseCharacterInfo(
	character: { [k: string]: unknown } & {} // ! FIX-ME: remove any cast
): CharacterInfo {
	const creator = {
		user_id: character.user_id,
		user__username: character.user__username,
		participant__name: character.participant__name,
	};
	const metadata = {
		num_likes: character.num_likes,
		num_chats: character.num_chats,
		participant__num_interactions: character.participant__num_interactions,
	};
	const characterInfo = {
		...character,
		avatar_url:
			"https://characterai.io/i/400/static/avatars/" +
			character.avatar_file_name,
		creator,
		metadata,
	} as CharacterInfo;
	return characterInfo;
}
