import type { CharacterInfo } from "../zod-schema";

/**
 * Type guard narrowing an unknown payload to a plain record.
 *
 * @param value Unknown payload.
 * @returns True when the payload is a non-null, non-array object.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Transforms raw Character.ai character API data into a normalized `CharacterInfo` object,
 * assembling avatar URLs, creator information, and interaction metrics.
 *
 * @param character - Raw character object returned by the Character.ai API.
 * @returns Parsed `CharacterInfo` structured object.
 */
export function parseCharacterInfo(character: unknown): CharacterInfo {
	const raw = isRecord(character) ? character : {};

	const creator = {
		user_id: raw.user_id,
		user__username: raw.user__username,
		participant__name: raw.participant__name,
	};
	const metadata = {
		num_likes: raw.num_likes,
		num_chats: raw.num_chats,
		participant__num_interactions: raw.participant__num_interactions,
	};
	const characterInfo = {
		...raw,
		avatar_url:
			"https://characterai.io/i/400/static/avatars/" +
			String(raw.avatar_file_name),
		creator,
		metadata,
	} as CharacterInfo;
	return characterInfo;
}
