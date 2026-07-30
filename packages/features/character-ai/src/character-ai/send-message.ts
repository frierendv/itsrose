import { ThirdPartyApiError } from "@itsrose/system";
import { client } from "../client";
import {
	ChatSendMessageResponseSchema,
	ChatSendMessageSchema,
	type ChatSendMessage,
	type ChatSendMessageResponse,
} from "../zod-schema";

export async function sendMessage(
	options: ChatSendMessage
): Promise<ChatSendMessageResponse> {
	const response = await client.chat.sendMessage(options);
	if (!response) {
		throw new ThirdPartyApiError(
			`Failed sending message to character ${options.external_id}`,
			500
		);
	}
	// ! Always clear to avoid storing history in character.ai
	if (!options.should_ressurect) {
		await client.chat.clearHistory({ chat_id: response.chat_id });
	}

	return response;
}

export const sendMessageSchema = {
	request: ChatSendMessageSchema,
	response: ChatSendMessageResponseSchema,
};
