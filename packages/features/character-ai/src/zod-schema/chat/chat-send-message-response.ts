import { z } from "zod/v4";

export const ChatSendMessageResponseSchema = z.object({
	chat_id: z.string().describe("Current chat id with this character."),
	candidates: z
		.array(
			z.object({
				create_time: z.string().describe("Time this reply generated"),
				raw_content: z.string().describe("Raw reply content."),
				is_final: z
					.boolean()
					.describe(
						"By default we wait until final reply from character."
					),
				model_type: z
					.string()
					.optional()
					.describe(
						"The mode type that used for generating this response."
					),
			})
		)
		.describe("Character response candidates."),
	/**
	 * The generation mode the reply was produced with.
	 *
	 * The upstream sends a map whose entries depend on the mode, so the values
	 * stay `unknown`; the reader narrows the entries it cares about.
	 */
	generation_mode: z.record(z.string(), z.unknown()),
	/**
	 * The statistics of the context the reply was produced with.
	 *
	 * The upstream sends a map of counters whose entries depend on the model,
	 * so the values stay `unknown`; the reader narrows the entries it cares
	 * about.
	 */
	context_stats: z.record(z.string(), z.unknown()),
});

export type ChatSendMessageResponse = z.infer<
	typeof ChatSendMessageResponseSchema
>;
