import { randomUUID } from "node:crypto";
import type { Client } from "../client";
import type { ChatCommand, ChatMessage } from "../zod-schema";

export type ChatData<TPayload> = {
	command: ChatCommand;
	request_id: string;
	payload: TPayload;
	origin_id: string | "web";
};
export class ChatHelper {
	constructor(private readonly client: Client) {}
	/** Short helper for getting user id */
	private get userId() {
		return String(this.client.user.detail?.user.id);
	}
	/** Short helper for getting user account name */
	private get userAccountName() {
		return String(this.client.user.detail?.user.account.name);
	}
	/**
	 * Create new chat or continue chat
	 *
	 * @param {string} externalId Character id
	 * @param {?string} [chatId] previous chat id if any
	 */
	public createChat(externalId: string, chatId?: string) {
		const currentChatId = chatId || randomUUID();
		const payload = {
			chat: {
				chat_id: currentChatId,
				creator_id: this.userId,
				visibility: "VISIBILITY_PRIVATE", // Always do private chat
				character_id: externalId,
				type: "TYPE_ONE_ON_ONE",
			},
			with_greeting: false,
		};
		const chat: ChatData<typeof payload> = {
			command: "create_chat",
			request_id: randomUUID() as string,
			payload,
			origin_id: "web",
		};
		return { chat_id: currentChatId, chat };
	}

	/**
	 * Create chat message parameter
	 *
	 * @param {Character.IChatMessage} options
	 */
	public createChatMessage(options: ChatMessage) {
		const { character_id, chat_id, raw_content } = options;

		const payload = {
			num_candidates: 1,
			character_id,
			turn: {
				turn_key: {
					turn_id: randomUUID(),
					chat_id,
				},
				author: {
					author_id: this.userId,
					is_human: true,
					name: this.userAccountName, // * Can be override?
				},
				candidates: [
					{
						candidate_id: randomUUID(),
						raw_content,
					},
				],
			},
		};
		const chat: ChatData<typeof payload> = {
			command: "create_and_generate_turn",
			request_id: randomUUID() as string,
			payload,
			origin_id: "web",
		};
		return chat;
	}
}
