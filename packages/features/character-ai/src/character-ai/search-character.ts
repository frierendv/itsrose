import { client } from "../client";
import {
	SearchCharacterResponseSchema,
	SearchCharacterSchema,
	type SearchCharacter,
	type SearchCharacterResponse,
} from "../zod-schema";

export async function searchCharacter(
	options: SearchCharacter
): Promise<SearchCharacterResponse> {
	const response = await client.character.search(options);

	return response;
}

export const searchCharacterSchema = {
	request: SearchCharacterSchema,
	response: SearchCharacterResponseSchema,
};
