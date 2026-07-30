import { randomUUID } from "node:crypto";
import type { Client } from "../client";
import type { ChatCommand, ChatMessage } from "../zod-schema";

/**
 * Represents a WebSocket message envelope sent to Character.ai services.
 *
 * @template TPayload - Type of data payload inside the envelope.
 */
export type ChatData<TPayload> = {
	command: ChatCommand;
	request_id: string;
	payload: TPayload;
	origin_id: string | "web";
};

/**
 * Helper class for constructs and formats WebSocket request payloads
 * required by Character.ai Neo chat commands.
 */
export class ChatHelper {
	/**
	 * Creates an instance of `ChatHelper`.
	 *
	 * @param client - The root Client instance.
	 */
	constructor(private readonly client: Client) {}

	/**
	 * Internal helper property to retrieve the authenticated user ID string.
	 */
	private get userId() {
		return String(this.client.user.detail?.user.id);
	}

	/**
	 * Internal helper property to retrieve the authenticated user account name string.
	 */
	private get userAccountName() {
		return String(this.client.user.detail?.user.account.name);
	}

	/**
	 * Constructs the initial `create_chat` WebSocket payload for opening or resuming a character chat session.
	 *
	 * @param externalId - Character external ID.
	 * @param chatId - Optional existing chat UUID. If omitted, a new UUID is generated.
	 * @returns Object containing the effective `chat_id` and formatted `ChatData` payload envelope.
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
	 * Constructs the `create_and_generate_turn` WebSocket payload for sending a user turn to a character.
	 *
	 * @param options - Options detailing target character ID, chat session ID, and user raw content.
	 * @returns Formatted `ChatData` payload envelope ready for WebSocket dispatch.
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
