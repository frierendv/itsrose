// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Character {
	export type Command = "create_chat" | "create_and_generate_turn";
	export type Chat<TPayload> = {
		command: Command;
		request_id: string;
		payload: TPayload;
		origin_id: string;
	};
	export interface IChatMessage {
		chat_id: string;
		/**
		 * Character/external id
		 *
		 * :: **external_id and character_id are same** ::
		 *
		 * @type {string}
		 */
		character_id: string;
		/**
		 * `raw_content` is the message sent to character
		 *
		 * @type {string}
		 */
		raw_content: string;
	}
}
