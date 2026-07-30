import { parseCharacterInfo } from "../utils";
import type { CharacterInfo, SearchCharacter } from "../zod-schema";
import type { Client } from "./client";

export class Character {
	constructor(protected readonly client: Client) {}
	/**
	 * Retrieve character info data
	 *
	 * @param {string} characterId
	 * @returns {Promise<CharacterInfo>}
	 */
	public async info(
		options: Pick<CharacterInfo, "external_id">
	): Promise<CharacterInfo> {
		const { data } = await this.client.http.post<{ character: {} }>(
			"/character/v1/get_character_info",
			options
		);

		return parseCharacterInfo(data.character);
	}
	/**
	 * Search character
	 *
	 * @param {{ query: string }} options
	 * @returns {{ characters: CharacterInfo[] }}
	 */
	public async search(
		options: SearchCharacter
	): Promise<{ characters: CharacterInfo[] }> {
		const { data } = await this.client.http.get<{ characters: {}[] }>(
			"/search/v1/character",
			{ params: { sortedBy: "relevance", ...options } }
		);

		const characters = data.characters.map(parseCharacterInfo);
		return { characters };
	}
}
