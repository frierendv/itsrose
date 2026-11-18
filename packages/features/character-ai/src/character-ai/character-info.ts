import { ThirdPartyApiError } from "@itsrose/system";
import { client } from "../client";
import {
	CharacterInfoRequestSchema,
	CharacterInfoSchema,
	type CharacterInfoRequest,
} from "../zod-schema";

export async function characterInfo(options: CharacterInfoRequest) {
	const response = await client.character.info(options);

	// maybe
	if (!response) {
		throw new ThirdPartyApiError(
			"Failed to retrieve character information.",
			400
		);
	}

	return response;
}

export const characterInfoSchema = {
	request: CharacterInfoRequestSchema,
	response: CharacterInfoSchema,
};
