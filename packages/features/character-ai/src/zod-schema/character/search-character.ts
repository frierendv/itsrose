import { z } from "zod/v4";
import { CharacterInfoSchema } from "./character-info";

export const SearchCharacterSchema = z.object({
	query: z.string(),
});
export const SearchCharacterResponseSchema = z.object({
	characters: z.array(CharacterInfoSchema),
});

export type SearchCharacter = z.infer<typeof SearchCharacterSchema>;
export type SearchCharacterResponse = z.infer<
	typeof SearchCharacterResponseSchema
>;
