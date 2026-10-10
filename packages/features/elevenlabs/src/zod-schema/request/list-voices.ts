import { z } from "zod/v4";

/**
 * @see https://elevenlabs.io/docs/api-reference/voices/search
 */
export const ElevenLabsListVoicesSchema = z
	.object({
		next_page_token: z
			.string()
			.nullable()
			.optional()
			.describe(
				"The next page token to use for pagination. Returned from the previous request. " +
					"Use this in combination with the `has_more` flag for reliable pagination."
			),
		page_size: z.coerce
			.number()
			.int()
			.positive()
			.max(100)
			.optional()
			.describe(
				"How many voices to return at maximum. " +
					"Can not exceed `100`, defaults to `10`. "
			),
		search: z
			.string()
			.nullish()
			.optional()
			.describe(
				"Search term to filter voices by. Searches in `name`, `description`, `labels` and `category`."
			),
		sort: z
			.enum(["name", "created_at_unix"])
			.nullish()
			.optional()
			.describe("Sort order of the returned voices."),
		sort_direction: z
			.enum(["asc", "desc"])
			.nullish()
			.optional()
			.describe("Direction of the sorting."),
		voice_type: z
			.enum([
				"personal",
				"community",
				"default",
				"workspace",
				"non-default",
				"non-community",
				"saved",
			])
			.nullish()
			.optional()
			.describe("Filter voices by type."),
		category: z
			.enum(["premade", "cloned", "generated", "professional"])
			.nullish()
			.optional()
			.describe("Category of the voice to filter by."),
	})
	.partial()
	.meta({
		id: "ElevenLabsListVoices",
	});

export interface IElevenLabsListVoices extends z.infer<
	typeof ElevenLabsListVoicesSchema
> {}
