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
	generation_mode: z.record(z.string(), z.any()),
	context_stats: z.record(z.string(), z.any()),
});

export type ChatSendMessageResponse = z.infer<
	typeof ChatSendMessageResponseSchema
>;
