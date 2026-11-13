/**
 * Unwraps a Better Auth response into its data, throwing the error if the
 * call failed.
 *
 * This is the single place where the API envelope is unwrapped, so a caller
 * never has to destructure `{ data, error }` by hand.
 */
export async function withAuthQuery<T, E = unknown>(
	promise: Promise<{ data: T; error: E }>
): Promise<T> {
	const { data, error } = await promise;
	if (error) {
		throw error;
	}
	return data;
}

/**
 * Builds a TanStack Query function from an auth call.
 *
 * The call is passed as a thunk rather than a promise so that nothing is
 * requested until the query actually runs. A promise argument would start the
 * request at the call site — before TanStack Query could decide whether the
 * query is enabled — so a disabled query would still hit the network.
 */
export function withAuthQueryFn<T, E = unknown>(
	run: () => Promise<{ data: T; error: E }>
) {
	return async () => withAuthQuery<T, E>(run());
}
