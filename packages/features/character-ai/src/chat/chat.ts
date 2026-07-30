import type { Client } from "../client";
import type { ChatSendMessage, ChatSendMessageResponse } from "../zod-schema";
import { ChatHelper } from "./chat-helper";
import { ChatSocket } from "./chat-socket";

export class Chat {
	private helper: ChatHelper;

	constructor(private readonly client: Client) {
		this.helper = new ChatHelper(this.client);
	}
	/**
	 * Clear/delete chat history (cai only hide it from user?).
	 *
	 * :: delete chat endpoint `/chat/{chatId}/resurrect` ::
	 *
	 * @param {{chat_id:string}} options
	 * @returns {Promise<boolean>}
	 */
	public async clearHistory(options: { chat_id: string }): Promise<boolean> {
		const { error } = await this.client.http
			.get(`/chat/${options.chat_id}/resurrect`)
			.onError(() => true);

		return !error;
	}
	/**
	 * Send message to character
	 *
	 * @public
	 * @async
	 * @param {Pick<ChatSendMessage, "message" | "external_id" | "chat_id">} options
	 * @returns {Promise<ChatSendMessageResponse | null>}
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
