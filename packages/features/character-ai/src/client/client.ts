import { createHttpClient, type HttpClient } from "@itsrose/http-client";
import { getEnv } from "@itsrose/system";
import { Chat } from "../chat";
import { parseCharacterInfo } from "../utils/parse-character";
import type { ICharacterInfo } from "../zod-schema";

/**
 * Character.ai is not forcing you to verify ID to use their service.
 * So you need to verify first before using this API client
 *
 */
export class CAIClient {
	#token: string;

	public neoBaseUrl: string;
	public neoWssUrl: string;
	public http: HttpClient;

	public chat: Chat;

	constructor() {
		this.#token = getEnv("CAI_USER_TOKEN", { isRequired: true });
		this.neoBaseUrl = getEnv("CAI_NEO_BASE_URL", { isRequired: true });
		this.neoWssUrl = this.neoBaseUrl + "/ws/";

		this.http = createHttpClient({
			baseURL: this.neoBaseUrl,
			headers: this.getHeaders(),
		});

		this.chat = new Chat(this);
	}

	/** @internal this method should be internal */
	public getHeaders() {
		return {
			Cookie: `HTTP_AUTHORIZATION="Token ${this.#token}";`,
		};
	}

	/**
	 * Retrieve character info data
	 *
	 * @param {string} characterId
	 * @returns {Promise<ICharacterInfo>}
	 */
	public async characterInfo(characterId: string): Promise<ICharacterInfo> {
		const { data } = await this.http.post<{ character: object }>(
			"/character/v1/get_character_info",
			{ external_id: characterId }
		);

		return parseCharacterInfo(data.character);
	}
	/**
	 * Search character
	 *
	 * @param {{ query: string }} options
	 * @returns {{ characters: ICharacterInfo[] }}
	 */
	public async searchCharacter(options: {
		query: string;
	}): Promise<{ characters: ICharacterInfo[] }> {
		const { data } = await this.http.get<{ characters: object[] }>(
			"/search/v1/character",
			{ params: { sortedBy: "relevance", ...options } }
		);

		const characters = data.characters.map(parseCharacterInfo);
		return { characters };
	}
}
