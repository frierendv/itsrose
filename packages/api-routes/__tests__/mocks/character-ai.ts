/**
 * The Character.ai client, replaced by a stub.
 */
import {
	SearchCharacterResponseSchema,
	SearchCharacterSchema,
} from "../../../features/character-ai/src/zod-schema/character";
import {
	ChatSendMessageResponseSchema,
	ChatSendMessageSchema,
} from "../../../features/character-ai/src/zod-schema/chat";

export const searchCharacter = async () => ({ characters: [] });
export const searchCharacterSchema = {
	request: SearchCharacterSchema,
	response: SearchCharacterResponseSchema,
};

export const sendMessage = async () => ({
	chat_id: "chat",
	candidates: [],
	generation_mode: {},
	context_stats: {},
});
export const sendMessageSchema = {
	request: ChatSendMessageSchema,
	response: ChatSendMessageResponseSchema,
};
