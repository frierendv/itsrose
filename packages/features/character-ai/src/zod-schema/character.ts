import { z } from "zod/v4";

export const CharacterInfoSchema = z
	.object({
		/** external_id */
		external_id: z
			.string()
			.describe(
				"The character external id used for chat with character."
			),
		/** title */
		title: z
			.string()
			.describe("Given title from their creator for this character."),

		avatar_url: z
			.string()
			.nullable()
			.default(null)
			.describe("Character avatar url if any."),
		tag: z.string().optional().describe("Single character tag."),
		/**description */
		description: z.string("Given description from their creator."),
		/** greeting */
		greeting: z
			.string()
			.describe(
				"This is the greeting prompt that have been set from the character creator."
			),
		primary_language: z
			.string()
			.default("OTHER")
			.describe("Primary language for the character."),
		is_licensed_professional: z
			.boolean()
			.describe("Is this character have professional license."),
		creator: z
			.object({
				user_id: z.any().describe("Creator user id.").optional(),
				user__username: z
					.string()
					.describe("Creator username.")
					.optional(),
				participant__name: z
					.string()
					.describe("Creator name (in their profile)")
					.optional(),
			})
			.describe("Additional details about character creator if any."),

		metadata: z
			.object({
				num_likes: z.number().describe("Number of likes.").optional(),
				num_chats: z.number().describe("Number of chats.").optional(),
				participant__num_interactions: z
					.number()
					.describe("Number of interactions")
					.optional(),
			})
			.describe("Character metadata if any."),
	})
	.meta({
		id: "CaiCharacterInfoSchema",
		description: "Character info schema",
	});

export type ICharacterInfo = z.infer<typeof CharacterInfoSchema>;
