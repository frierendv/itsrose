import { createHttpClient, type HttpClient } from "@itsrose/http-client";
import { getEnv } from "@itsrose/system";
import { Chat } from "../chat";
import { Character } from "./character";
import { User } from "./user";

/**
 * Core client for interacting with Character.ai Neo service.
 * Handles authentication header construction, HTTP REST requests,
 * and orchestrates sub-clients for user profile management, character searching,
 * and real-time WebSocket chat streaming.
 *
 * @remarks
 * Environment variables required:
 * - `CAI_USER_TOKEN`: Character.ai user account token.
 * - `CAI_NEO_BASE_URL`: Base URL for Neo HTTP and WebSocket services.
 *
 * @example
 * ```ts
 * import { Client } from "@itsrose/character-ai";
 *
 * const client = new Client();
 * const user = await client.user.get();
 * const search = await client.character.search({ query: "Anime" });
 * ```
 *
 * ```mermaid
 * sequenceDiagram
 *     autonumber
 *     actor Caller as Application / Caller
 *     participant Client as Client
 *     participant User as User Sub-client
 *     participant Chat as Chat Sub-client
 *     participant Socket as ChatSocket (WebSocket)
 *     participant CAI as Character.ai Backend
 *
 *     Note over Client: Reads environment configuration<br/>(CAI_USER_TOKEN & CAI_NEO_BASE_URL)
 *     Caller->>Client: new Client()
 *     Client->>User: initialize User(this)
 *     Client->>Character: initialize Character(this)
 *     Client->>Chat: initialize Chat(this)
 *
 *     Caller->>Chat: sendMessage({ message, external_id, chat_id })
 *     alt User profile not yet cached
 *         Chat->>User: get()
 *         User->>CAI: GET /user/ (HTTP)
 *         CAI-->>User: UserDetail response
 *     end
 *
 *     Chat->>Socket: create() & waitForOpen()
 *     Socket->>CAI: WSS Connect (Headers: Token Auth)
 *     CAI-->>Socket: WebSocket Opened
 *
 *     Chat->>Socket: send(create_chat)
 *     Socket->>CAI: WebSocket Payload "create_chat"
 *     Chat->>Socket: send(create_and_generate_turn)
 *     Socket->>CAI: WebSocket Payload "create_and_generate_turn"
 *
 *     loop Streaming Turns
 *         CAI-->>Socket: "update_turn" message frames
 *     end
 *     Socket-->>Chat: Final turn candidate output (ChatSendMessageResponse)
 *
 *     opt Auto-clean history (should_ressurect = false)
 *         Chat->>CAI: GET /chat/{chat_id}/resurrect (HTTP)
 *     end
 *     Chat-->>Caller: ChatSendMessageResponse
 * ```
 */
export class Client {
	#token: string;

	/**
	 * Base URL for the Character.ai Neo HTTP services.
	 */
	public neoBaseUrl: string;

	/**
	 * WebSocket URL endpoint derived from `neoBaseUrl`.
	 */
	public neoWssUrl: string;

	/**
	 * Configured Axios-backed HTTP client configured with auth headers.
	 */
	public http: HttpClient;

	/**
	 * Sub-client for fetching and managing user profile details.
	 */
	public user: User;

	/**
	 * Sub-client for searching and fetching character profiles.
	 */
	public character: Character;

	/**
	 * Sub-client for real-time WebSocket chat interactions.
	 */
	public chat: Chat;

	/**
	 * Creates and initializes a new instance of the `Client`.
	 * Reads required environment variables (`CAI_USER_TOKEN`, `CAI_NEO_BASE_URL`)
	 * and initializes sub-client instances.
	 *
	 * @throws {Error} If `CAI_USER_TOKEN` or `CAI_NEO_BASE_URL` are missing in environment.
	 */
	constructor() {
		this.#token = getEnv("CAI_USER_TOKEN", { isRequired: true });
		this.neoBaseUrl = getEnv("CAI_NEO_BASE_URL", { isRequired: true });
		this.neoWssUrl = this.neoBaseUrl + "/ws/";

		this.http = createHttpClient({
			baseURL: this.neoBaseUrl,
			headers: this.getHeaders(),
		});

		this.user = new User(this);
		this.chat = new Chat(this);
		this.character = new Character(this);
	}

	/**
	 * Generates authentication headers required for Character.ai API requests.
	 *
	 * @internal
	 * @returns Object containing the HTTP `Cookie` header formatted with the authorization token.
	 */
	public getHeaders() {
		return {
			Cookie: `HTTP_AUTHORIZATION="Token ${this.#token}";`,
		};
	}
}

// #if !CAI_API_ENABLE
/**
 * Singleton default client instance automatically initialized from environment variables.
 */
export const client = new Client();
// #endif
