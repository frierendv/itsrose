import { ThirdPartyApiError } from "@itsrose/system";
import type { UserDetail } from "../zod-schema";
import type { Client } from "./client";

export class User {
	private _user: UserDetail | undefined = undefined;

	constructor(private readonly client: Client) {}

	private async _fetchUser(): Promise<UserDetail> {
		if (this._user) {
			return this._user;
		}
		const { data } = await this.client.http.get<{
			user: UserDetail;
		}>("/user/");
		this._user = data.user;
		return this._user;
	}
	/**
	 * Get user details
	 *
	 * @returns {Promise<UserDetail>}
	 */
	public async get(): Promise<UserDetail> {
		const user = await this._fetchUser();
		if (!user || !this._user) {
			throw new ThirdPartyApiError(
				"Cannot fetch user information. Wrong configuration or outdated API.",
				500
			);
		}
		return this._user;
	}

	public get detail() {
		return this._user;
	}
}
