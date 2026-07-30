import { createHttpClient, type HttpClient } from "@itsrose/http-client";
import { getEnv } from "@itsrose/system";
import { Chat } from "../chat";
import { Character } from "./character";
import { User } from "./user";

/**
 * Character.ai is not forcing you to verify ID to use their service.
 * So you need to verify first before using this API client
 *
 */
export class Client {
	#token: string;

	public neoBaseUrl: string;
	public neoWssUrl: string;
	public http: HttpClient;

	public user: User;
	public character: Character;
	public chat: Chat;

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

	/** @internal this method should be internal */
	public getHeaders() {
		return {
			Cookie: `HTTP_AUTHORIZATION="Token ${this.#token}";`,
		};
	}
}

// #if !CAI_API_ENABLE
/** static client */
export const client = new Client();
// #endif
