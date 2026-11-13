import { withAuthQuery, withAuthQueryFn } from "../api/with-auth-query";

type User = { id: string };
type AuthError = { message: string };

describe("dashboard lib/api with-auth-query", () => {
	describe("withAuthQuery", () => {
		it("returns the data of a successful response", async () => {
			const result = await withAuthQuery<User, AuthError | null>(
				Promise.resolve({ data: { id: "user_1" }, error: null })
			);

			expect(result).toEqual({ id: "user_1" });
		});

		it("throws the error of a failed response", async () => {
			const error: AuthError = { message: "Not found" };

			await expect(
				withAuthQuery<User | null, AuthError | null>(
					Promise.resolve({ data: null, error })
				)
			).rejects.toBe(error);
		});
	});

	describe("withAuthQueryFn", () => {
		it("does not start the request until the query function runs", async () => {
			let called = false;

			const queryFn = withAuthQueryFn<User, AuthError | null>(() => {
				called = true;
				return Promise.resolve({ data: { id: "user_1" }, error: null });
			});

			// A query that is disabled must not reach the network. The request
			// can only be deferred if the call is handed over as a thunk.
			expect(called).toBe(false);

			await expect(queryFn()).resolves.toEqual({ id: "user_1" });
			expect(called).toBe(true);
		});

		it("propagates the error of a failed call", async () => {
			const error: AuthError = { message: "Not found" };

			const queryFn = withAuthQueryFn<User | null, AuthError | null>(() =>
				Promise.resolve({ data: null, error })
			);

			await expect(queryFn()).rejects.toBe(error);
		});
	});
});
