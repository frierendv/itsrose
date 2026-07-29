import { randomUUID } from "node:crypto";
import type { CAIClient } from "../client";
import { AUTHOR_ID, ORIGIN_REQUEST_ID } from "../constants/user";
import type { Character } from "../types";

export class ChatHelper {
	constructor(private readonly client: CAIClient) {}
	/**
	 * Create new chat or continue chat
	 *
	 * @param {string} externalId Character id
	 * @param {?string} [chatId] previous chat id if any
	 */
	createChat(externalId: string, chatId?: string) {
		const currentChatId = chatId || randomUUID();
		const payload = {
			chat: {
				chat_id: currentChatId,
				creator_id: AUTHOR_ID,
				visibility: "VISIBILITY_PRIVATE", // Always do private chat
				character_id: externalId,
				type: "TYPE_ONE_ON_ONE",
			},
			with_greeting: false,
		};
		const chat: Character.Chat<typeof payload> = {
			command: "create_chat",
			request_id: randomUUID() as string,
			payload,
			origin_id: ORIGIN_REQUEST_ID,
		};
		return { chat_id: currentChatId, chat };
	}

	/**
	 * Create chat message parameter
	 *
	 * @param {Character.IChatMessage} options
	 */
	createChatMessage(options: Character.IChatMessage) {
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
					author_id: AUTHOR_ID,
					is_human: true,
					name: "Surya", // ! FIX-ME: should not be hardcoded
				},
				candidates: [
					{
						candidate_id: randomUUID(),
						raw_content,
					},
				],
			},
		};
		const chat: Character.Chat<typeof payload> = {
			command: "create_and_generate_turn",
			request_id: randomUUID() as string,
			payload,
			origin_id: ORIGIN_REQUEST_ID,
		};
		return chat;
	}
}
