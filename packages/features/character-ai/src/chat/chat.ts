import type { Client } from "../client";
import type { ChatSendMessage, ChatSendMessageResponse } from "../zod-schema";
import { ChatHelper } from "./chat-helper";
import { ChatSocket } from "./chat-socket";

/**
 * Sub-client module for conducting real-time chats with Character.ai characters.
 * Handles WebSocket connection lifecycle, message payload generation, turn generation,
 * and optional conversation history clearance.
 */
export class Chat {
	private helper: ChatHelper;

	/**
	 * Creates an instance of the Chat sub-client.
	 *
	 * @param client - The root Client instance.
	 */
	constructor(private readonly client: Client) {
		this.helper = new ChatHelper(this.client);
	}

	/**
	 * Clears or hides the conversation history for a given chat session on Character.ai.
	 * Calls the `/chat/{chat_id}/resurrect` endpoint.
	 *
	 * @param options - Options object containing the `chat_id`.
	 * @returns `true` if the request succeeded or was handled without errors, `false` otherwise.
	 *
	 * @example
	 * ```ts
	 * const success = await client.chat.clearHistory({ chat_id: "chat_uuid_here" });
	 * ```
	 */
	public async clearHistory(options: { chat_id: string }): Promise<boolean> {
		try {
			await this.client.http.send({
				url: `/chat/${options.chat_id}/resurrect`,
			});
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Sends a user message to a character and waits for the AI model response turn.
	 * Automatically fetches authenticated user info if not cached, establishes a WebSocket
	 * connection to the Neo WebSocket service, sends the initialization payload, and streams output.
	 *
	 * @param options - Chat parameters including target `external_id` (character ID), `message`, and optional `chat_id`.
	 * @returns Promise resolving to `ChatSendMessageResponse` containing turn candidate responses, or `null`.
	 * @throws {ThirdPartyApiError} If authentication fails, socket error occurs, or response times out.
	 *
	 * @example
	 * ```ts
	 * const response = await client.chat.sendMessage({
	 *   external_id: "char_external_id",
	 *   message: "Hello!",
	 * });
	 * console.log(response?.candidates[0].raw_content);
	 * ```
	 */
	public async sendMessage(
		options: Pick<ChatSendMessage, "message" | "external_id" | "chat_id">
	): Promise<ChatSendMessageResponse | null> {
		/**
		 * * if no user try to fetch it.
		 * * Will throw here if any error occured
		 */
		if (!this.client.user.detail) {
			await this.client.user.get();
		}
		const { message, external_id, chat_id } = options;

		// create the socket connection
		const socket = new ChatSocket(this.client);
		socket.create();

		// wait until connection open then send the initial chat request
		const chatRequest = this.helper.createChat(external_id, chat_id);
		await socket.waitForOpen();
		socket.send(chatRequest.chat);

		const chatMessage = this.helper.createChatMessage({
			character_id: external_id,
			chat_id: chatRequest.chat_id,
			raw_content: message,
		});
		socket.send(chatMessage);
		await socket.waitForOutput();

		return socket.output;
	}
}
