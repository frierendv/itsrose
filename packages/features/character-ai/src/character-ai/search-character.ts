import { client } from "../client";
import {
	SearchCharacterResponseSchema,
	SearchCharacterSchema,
	type SearchCharacter,
	type SearchCharacterResponse,
} from "../zod-schema";

/**
 * Searches for Character.ai characters using the default singleton client instance.
 *
 * @param options - Search criteria including query text.
 * @returns Promise resolving to matching character search results.
 *
 * @example
 * ```ts
 * const result = await searchCharacter({ query: "Eula" });
 * ```
 */
export async function searchCharacter(
	options: SearchCharacter
): Promise<SearchCharacterResponse> {
	const response = await client.character.search(options);

	return response;
}

/**
 * Zod validation schemas for character search requests and responses.
 */
export const searchCharacterSchema = {
	request: SearchCharacterSchema,
	response: SearchCharacterResponseSchema,
};
