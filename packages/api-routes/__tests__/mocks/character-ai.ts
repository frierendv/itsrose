/**
 * The Character.ai client, replaced by a stub.
 */
import {
	CharacterInfoRequestSchema,
	CharacterInfoSchema,
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

export const characterInfo = async () => ({
	external_id: "char-1",
	title: "Mock Character",
	avatar_url: null,
	description: "Mock character description",
	greeting: "Hello there!",
	primary_language: "en",
	is_licensed_professional: false,
	creator: {},
	metadata: {},
});
export const characterInfoSchema = {
	request: CharacterInfoRequestSchema,
	response: CharacterInfoSchema,
};
