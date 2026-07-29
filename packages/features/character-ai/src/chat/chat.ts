import type { CAIClient } from "../client";
import { ORIGIN_REQUEST_ID } from "../constants/user";
import type {
	IChatSendMessage,
	IChatSendMessageResponse,
} from "../zod-schema/chat";
import { ChatHelper } from "./chat-helper";
import { ChatSocket } from "./chat-socket";

export class Chat {
	public originId: string;

	private helper: ChatHelper;

	constructor(private readonly client: CAIClient) {
		this.helper = new ChatHelper(this.client);
		this.originId = ORIGIN_REQUEST_ID;
	}
	/**
	 * Clear/delete chat history (cai only hide it from user?).
	 *
	 * :: delete chat endpoint `/chat/{chatId}/resurrect` ::
	 *
	 * @param {{chat_id:string}} options
	 * @returns {Promise<boolean>}
	 */
	public async clearChatHistory(options: {
		chat_id: string;
	}): Promise<boolean> {
		const { error } = await this.client.http
			.get(`/chat/${options.chat_id}/resurrect`)
			.onError(() => true);

		return !error;
	}

	public async sendMessage(
		options: Pick<IChatSendMessage, "message" | "external_id" | "chat_id">
	): Promise<IChatSendMessageResponse | null> {
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

		await this.clearChatHistory(chatRequest);
		return socket.output;
	}
}
