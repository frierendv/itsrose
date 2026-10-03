import type { CurrentUserAccount } from "../types";
import type { Client } from "./client";

export class User {
	public account?: CurrentUserAccount;
	private getMePromise?: Promise<CurrentUserAccount>;

	constructor(private readonly client: Client) {}
	/**
	 * Get the current created `<user>`
	 *
	 * @returns {Promise<CurrentUserAccount>}
	 */
	async getMe(): Promise<CurrentUserAccount> {
		if (this.account) {
			return this.account;
		}

		if (this.getMePromise) {
			return this.getMePromise;
		}

		this.getMePromise = (async () => {
			await this.client.ensureInitialized();
			const { data } = await this.client.get<CurrentUserAccount>(
				"/v1/mobile/users/@me"
			);
			this.account = data;
			return this.account;
		})();

		try {
			return await this.getMePromise;
		} finally {
			this.getMePromise = undefined;
		}
	}
}
