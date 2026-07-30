import { z } from "zod/v4";

export const ChatMessageSchema = z.object({
	chat_id: z.string(),
	/**
	 * Character/external id
	 *
	 * :: **external_id and character_id are same** ::
	 *
	 * @type {string}
	 */
	character_id: z.string(),
	/**
	 * `raw_content` is the message sent to character
	 */
	raw_content: z.string(),
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;
