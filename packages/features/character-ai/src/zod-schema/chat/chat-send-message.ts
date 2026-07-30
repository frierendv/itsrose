import { z } from "zod/v4";

export const ChatSendMessageSchema = z.object({
	external_id: z.string().describe("Character external id."),
	chat_id: z.string().optional().describe("Chat id used for continue chat."),
	message: z.string().describe("Message text sent to character."),
	should_ressurect: z
		.boolean()
		.optional()
		.describe("Ressurect past chat if exist"),
});

export type ChatSendMessage = z.infer<typeof ChatSendMessageSchema>;
