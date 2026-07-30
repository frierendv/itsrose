import { ThirdPartyApiError } from "@itsrose/system";
import type { Client } from "../src/client/client";
import { User } from "../src/client/user";
import type { UserDetail } from "../src/zod-schema";

describe("User", () => {
	let mockClient: Client;
	let mockHttpGet: jest.Mock;

	const dummyUserDetail: UserDetail = {
		user: {
			id: 999,
			username: "cai_user",
			account: {
				name: "CAI Account Name",
				avatar_type: "DEFAULT",
				avatar_file_name: null,
			},
			is_staff: false,
			subscription: null,
		},
		is_human: true,
	} as unknown as UserDetail;

	beforeEach(() => {
		mockHttpGet = jest.fn();
		mockClient = {
			http: {
				get: mockHttpGet,
			},
		} as unknown as Client;
	});

	it("should fetch user details from API and cache the result", async () => {
		mockHttpGet.mockResolvedValueOnce({
			data: { user: dummyUserDetail },
		});

		const user = new User(mockClient);
		expect(user.detail).toBeUndefined();

		const result = await user.get();

		expect(result).toEqual(dummyUserDetail);
		expect(user.detail).toEqual(dummyUserDetail);
		expect(mockHttpGet).toHaveBeenCalledWith("/user/");
		expect(mockHttpGet).toHaveBeenCalledTimes(1);

		// Subsequent call should use cache
		const cachedResult = await user.get();
		expect(cachedResult).toEqual(dummyUserDetail);
		expect(mockHttpGet).toHaveBeenCalledTimes(1);
	});

	it("should throw ThirdPartyApiError if fetched user is null or undefined", async () => {
		mockHttpGet.mockResolvedValueOnce({
			data: { user: null },
		});

		const user = new User(mockClient);

		await expect(user.get()).rejects.toThrow(ThirdPartyApiError);
	});
});
