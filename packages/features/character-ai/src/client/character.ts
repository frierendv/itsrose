import { parseUpstreamPayload } from "@itsrose/upstream-client";
import { parseCharacterInfo } from "../utils";
import {
	CharacterInfoSchema,
	SearchCharacterResponseSchema,
	type CharacterInfo,
	type SearchCharacter,
} from "../zod-schema";
import type { Client } from "./client";

/**
 * Sub-client module for managing Character.ai character profiles,
 * retrieving detailed character info, and performing character searches.
 */
export class Character {
	/**
	 * Creates an instance of the Character sub-client.
	 *
	 * @param client - The root Client instance.
	 */
	constructor(protected readonly client: Client) {}

	/**
	 * Retrieves detailed character information by character external ID.
	 *
	 * @param options - Options containing the `external_id` of the character.
	 * @returns Parsed `CharacterInfo` metadata including avatar URL and interaction metrics.
	 *
	 * @example
	 * ```ts
	 * const info = await client.character.info({ external_id: "char_uuid_here" });
	 * console.log(info.title, info.avatar_url);
	 * ```
	 */
	public async info(
		options: Pick<CharacterInfo, "external_id">
	): Promise<CharacterInfo> {
		const data = await this.client.http.send<{ character: unknown }>({
			url: "/character/v1/get_character_info",
			method: "post",
			data: options,
		});

		return parseUpstreamPayload(
			CharacterInfoSchema,
			parseCharacterInfo(data.character),
			{ service: "character-ai", label: "character" }
		);
	}

	/**
	 * Searches for characters on Character.ai matching a search query.
	 *
	 * @param options - Search parameters including query text and optional pagination.
	 * @returns Object containing an array of parsed `CharacterInfo` objects.
	 *
	 * @example
	 * ```ts
	 * const results = await client.character.search({ query: "Stella" });
	 * console.log(results.characters.map((c) => c.name));
	 * ```
	 */
	public async search(
		options: SearchCharacter
	): Promise<{ characters: CharacterInfo[] }> {
		const data = await this.client.http.send<{ characters: unknown[] }>({
			url: "/search/v1/character",
			params: { sortedBy: "relevance", ...options },
		});

		const characters = data.characters.map(parseCharacterInfo);

		return parseUpstreamPayload(
			SearchCharacterResponseSchema,
			{ characters },
			{ service: "character-ai", label: "characters" }
		);
	}
}
