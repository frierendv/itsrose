export async function withAuthQuery<T, E = unknown>(
	promise: Promise<{ data: T; error: E }>
): Promise<T> {
	const { data, error } = await promise;
	if (error) {
		throw error;
	}
	return data;
}
