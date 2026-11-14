import { ThirdPartyApiError } from "@itsrose/system";
import { parseUpstreamPayload } from "@itsrose/upstream-client";
import { UserDetailSchema, type UserDetail } from "../zod-schema";
import type { Client } from "./client";

/**
 * Sub-client for fetching and caching authenticated Character.ai user details.
 */
export class User {
	private _user: UserDetail | undefined = undefined;

	/**
	 * Creates an instance of the User sub-client.
	 *
	 * @param client - The root Client instance.
	 */
	constructor(private readonly client: Client) {}

	/**
	 * Internal helper to fetch user information from Character.ai API if not already cached.
	 *
	 * @internal
	 * @returns Cached or freshly fetched `UserDetail` object.
	 */
	private async _fetchUser(): Promise<UserDetail> {
		if (this._user) {
			return this._user;
		}
		const data = await this.client.http.send<{ user: unknown }>({
			url: "/user/",
		});
		// The published schema describes the detail the endpoint carries,
		// which is what this sub-client hands out.
		this._user = parseUpstreamPayload(UserDetailSchema, data.user, {
			service: "character-ai",
			label: "user",
		});
		return this._user;
	}

	/**
	 * Retrieves the authenticated user profile information.
	 * Caches the response internally for subsequent queries.
	 *
	 * @returns Promise resolving to the authenticated `UserDetail`.
	 * @throws {ThirdPartyApiError} If user information cannot be fetched or profile is missing.
	 *
	 * @example
	 * ```ts
	 * const userProfile = await client.user.get();
	 * console.log(userProfile.user.username, userProfile.user.id);
	 * ```
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

	/**
	 * Returns the currently cached user detail object if previously fetched, or `undefined`.
	 *
	 * @readonly
	 */
	public get detail(): UserDetail | undefined {
		return this._user;
	}
}
