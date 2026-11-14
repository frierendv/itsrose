import { ThirdPartyApiError } from "@itsrose/system";
import type { Client } from "../src/client/client";
import { User } from "../src/client/user";
import type { UserDetail } from "../src/zod-schema";

describe("User", () => {
	let mockClient: Client;
	let mockHttpSend: jest.Mock;

	/**
	 * The user detail as the upstream sends it, with every field the
	 * published schema requires.
	 */
	const dummyUserDetail = {
		user: {
			username: "cai_user",
			id: 999,
			first_name: "Cai",
			account: {
				name: "CAI Account Name",
				avatar_type: "DEFAULT",
				onboarding_complete: true,
				avatar_file_name: "avatar.png",
				mobile_onboarding_complete: 1,
			},
			is_staff: false,
			subscription: null,
			entitlements: [],
			ppid: "ppid",
			phone_settings: {
				phone_number: "+620000000000",
				verified_at: "2024-01-01",
			},
			age_data: {
				age_category: "adult",
				verification_status: "verified",
			},
		},
		is_human: true,
		name: "Cai User",
		email: "cai@example.com",
		date_joined: "2024-01-01",
		date_of_birth: "2000-01-01",
		needs_to_acknowledge_policy: false,
		accepted_policy_acknowledgements: [],
		hidden_characters: [],
		blocked_users: [],
	} satisfies UserDetail;

	beforeEach(() => {
		mockHttpSend = jest.fn();
		mockClient = {
			http: {
				send: mockHttpSend,
			},
		} as unknown as Client;
	});

	it("should fetch user details from API and cache the result", async () => {
		mockHttpSend.mockResolvedValueOnce({ user: dummyUserDetail });

		const user = new User(mockClient);
		expect(user.detail).toBeUndefined();

		const result = await user.get();

		expect(result).toEqual(dummyUserDetail);
		expect(user.detail).toEqual(dummyUserDetail);
		expect(mockHttpSend).toHaveBeenCalledWith({ url: "/user/" });
		expect(mockHttpSend).toHaveBeenCalledTimes(1);

		// Subsequent call should use cache
		const cachedResult = await user.get();
		expect(cachedResult).toEqual(dummyUserDetail);
		expect(mockHttpSend).toHaveBeenCalledTimes(1);
	});

	it("should throw ThirdPartyApiError if fetched user is null or undefined", async () => {
		mockHttpSend.mockResolvedValueOnce({ user: null });

		const user = new User(mockClient);

		await expect(user.get()).rejects.toThrow(ThirdPartyApiError);
	});

	it("rejects a user detail the upstream drifted on", async () => {
		mockHttpSend.mockResolvedValueOnce({
			user: { ...dummyUserDetail, email: undefined },
		});

		const user = new User(mockClient);

		await expect(user.get()).rejects.toThrow(
			"did not match the published schema"
		);
	});
});
