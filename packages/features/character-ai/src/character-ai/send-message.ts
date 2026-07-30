import { ThirdPartyApiError } from "@itsrose/system";
import { client } from "../client";
import {
	ChatSendMessageResponseSchema,
	ChatSendMessageSchema,
	type ChatSendMessage,
	type ChatSendMessageResponse,
} from "../zod-schema";

/**
 * Sends a chat message to a specified Character.ai character using the default singleton client.
 * Automatically clears chat session history after completion unless `should_ressurect` is enabled.
 *
 * @param options - Message details including `external_id` (character ID), `message`, and optional parameters.
 * @returns Promise resolving to `ChatSendMessageResponse`.
 * @throws {ThirdPartyApiError} If message dispatch fails or receives no response from Character.ai API.
 *
 * @example
 * ```ts
 * const response = await sendMessage({
 *   external_id: "char_external_id",
 *   message: "Hello Stella!",
 * });
 * ```
 */
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

/**
 * Zod validation schemas for sending chat messages.
 */
export const sendMessageSchema = {
	request: ChatSendMessageSchema,
	response: ChatSendMessageResponseSchema,
};
